-- WordBread Database Schema
-- Complete schema definition as of 2026-05-04
-- Previous migration files have been archived to _archived/

-- ============================================
-- Helper function for updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Table 1: profiles
-- Purpose: User profile and learning preferences
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    target_exam TEXT NOT NULL DEFAULT 'CET6'
        CHECK (target_exam = ANY (ARRAY['CET4', 'CET6'])),
    major_category TEXT DEFAULT '综合'
        CHECK (major_category = ANY (ARRAY[
            '综合', '农业与环境学', '生物学', '化学', '物理学', '医学',
            '经济学', '法学', '计算机科学', '工程学', '艺术学', '哲学',
            '教育学', '文学', '历史学', '管理学'
        ])),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profiles_nickname_unique UNIQUE (nickname)
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_target_exam ON profiles(target_exam);
CREATE INDEX idx_profiles_major_category ON profiles(major_category);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'sub')::uuid = user_id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK ((auth.jwt() ->> 'sub')::uuid = user_id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING ((auth.jwt() ->> 'sub')::uuid = user_id);

-- ============================================
-- Table 2: words
-- Purpose: Vocabulary list with exam levels
-- ============================================
CREATE TABLE words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lemma TEXT NOT NULL,
    exam_level TEXT
        CHECK (exam_level = ANY (ARRAY['common', 'CET4', 'CET6', 'out_of_syllabus'])),
    is_common BOOLEAN DEFAULT false,
    pos TEXT,
    cn_gloss TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT words_lemma_key UNIQUE (lemma)
);

CREATE INDEX idx_words_lemma ON words(lemma);
CREATE INDEX idx_words_exam_level ON words(exam_level);
CREATE INDEX idx_words_is_common ON words(is_common);

ALTER TABLE words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read words"
    ON words FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- Table 3: news_candidates
-- Purpose: Raw candidate news before processing
-- ============================================
CREATE TABLE news_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id TEXT NOT NULL,
    source_url TEXT,
    source_name TEXT,
    source_category TEXT,
    source_title TEXT,
    source_summary TEXT,
    source_body_text TEXT,
    source_published_at TIMESTAMPTZ,
    subject_category TEXT,
    subject_confidence NUMERIC,
    subject_reason TEXT,
    secondary_categories TEXT[],
    is_selected BOOLEAN DEFAULT false,
    is_selected_rank INTEGER,
    CONSTRAINT news_candidates_candidate_id_key UNIQUE (candidate_id)
);

CREATE INDEX idx_news_candidates_candidate_id ON news_candidates(candidate_id);
CREATE INDEX idx_news_candidates_source_name ON news_candidates(source_name);
CREATE INDEX idx_news_candidates_source_published_at ON news_candidates(source_published_at);
CREATE INDEX idx_news_candidates_subject_category ON news_candidates(subject_category);
CREATE INDEX idx_news_candidates_is_selected ON news_candidates(is_selected);

ALTER TABLE news_candidates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Table 4: articles
-- Purpose: Rewritten learning articles (CET4/CET6 versions)
-- Note: candidate_id is NOT a foreign key - articles are independent
-- ============================================
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id TEXT,
    source_url TEXT,
    source_name TEXT,
    source_published_at TIMESTAMPTZ,
    subject_category TEXT,
    title_en TEXT,
    title_zh TEXT,
    cet4_body_en TEXT,
    cet4_body_zh TEXT,
    cet6_body_en TEXT,
    cet6_body_zh TEXT,
    token_status TEXT
);

CREATE INDEX idx_articles_candidate_id ON articles(candidate_id);
CREATE INDEX idx_articles_source_name ON articles(source_name);
CREATE INDEX idx_articles_subject_category ON articles(subject_category);
CREATE INDEX idx_articles_source_published_at ON articles(source_published_at);
CREATE INDEX idx_articles_token_status ON articles(token_status) WHERE token_status IS NOT NULL;

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read"
    ON articles FOR SELECT
    USING (true);

-- ============================================
-- Table 5: article_tokens
-- Purpose: Structured tokens for article rendering
-- ============================================
CREATE TABLE article_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    target_exam TEXT NOT NULL CHECK (target_exam = ANY (ARRAY['CET4', 'CET6'])),
    token_index INTEGER NOT NULL,
    sentence_index INTEGER NOT NULL DEFAULT 0,
    surface TEXT NOT NULL,
    token_type TEXT NOT NULL
        CHECK (token_type = ANY (ARRAY['word', 'space', 'punctuation', 'newline', 'number', 'other'])),
    lemma TEXT,
    word_id UUID REFERENCES words(id) ON DELETE SET NULL,
    short_explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT article_tokens_article_id_fkey FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT article_tokens_word_id_fkey FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_article_tokens_unique ON article_tokens(article_id, target_exam, token_index);
CREATE INDEX idx_article_tokens_lookup ON article_tokens(article_id, target_exam, token_index);
CREATE INDEX idx_article_tokens_sentence ON article_tokens(article_id, target_exam, sentence_index);
CREATE INDEX idx_article_tokens_word_id ON article_tokens(word_id) WHERE word_id IS NOT NULL;
CREATE INDEX idx_article_tokens_lemma ON article_tokens(article_id, target_exam, lemma) WHERE lemma IS NOT NULL;

ALTER TABLE article_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tokens"
    ON article_tokens FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- Table 6: read_articles
-- Purpose: User's read article history (permanent)
-- ============================================
CREATE TABLE read_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT read_articles_user_id_article_id_key UNIQUE (user_id, article_id),
    CONSTRAINT read_articles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_read_articles_user_id ON read_articles(user_id);
CREATE INDEX idx_read_articles_article_id ON read_articles(article_id);

ALTER TABLE read_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own read articles"
    ON read_articles FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'sub')::uuid = user_id);

-- ============================================
-- Table 7: user_word_states
-- Purpose: User vocabulary state (study_plan / difficult)
-- ============================================
CREATE TABLE user_word_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lemma TEXT NOT NULL,
    mastery_status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (mastery_status = ANY (ARRAY['known', 'learning', 'unknown'])),
    vocab_type TEXT NOT NULL DEFAULT 'study_plan'
        CHECK (vocab_type = ANY (ARRAY['study_plan', 'difficult'])),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    word_id UUID REFERENCES words(id) ON DELETE SET NULL,
    gloss_snapshot TEXT,
    CONSTRAINT user_word_states_user_id_lemma_key UNIQUE (user_id, lemma)
);

CREATE INDEX idx_user_word_states_user_id ON user_word_states(user_id);
CREATE INDEX idx_user_word_states_lemma ON user_word_states(lemma);
CREATE INDEX idx_user_word_states_mastery_status ON user_word_states(mastery_status);

ALTER TABLE user_word_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own word states"
    ON user_word_states FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'sub')::uuid = user_id);

-- ============================================
-- RPC function for nickname login
-- ============================================
CREATE OR REPLACE FUNCTION get_email_by_nickname(p_nickname TEXT)
RETURNS TEXT AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT au.email INTO v_email
    FROM profiles p
    JOIN auth.users au ON au.id = p.user_id
    WHERE p.nickname = p_nickname;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_email_by_nickname(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_by_nickname(TEXT) TO anon;
