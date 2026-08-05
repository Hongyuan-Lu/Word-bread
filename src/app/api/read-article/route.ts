import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { article_id } = body;

    if (!article_id) {
      return NextResponse.json({ error: 'article_id is required' }, { status: 400 });
    }

    const { data: existingRead } = await supabase
      .from('read_articles')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', article_id)
      .maybeSingle();

    let isRead: boolean;

    if (existingRead) {
      const { error: deleteError } = await supabase
        .from('read_articles')
        .delete()
        .eq('id', existingRead.id);

      if (deleteError) {
        console.error('Error removing read article:', deleteError);
        return NextResponse.json({ error: 'Failed to unmark as read' }, { status: 500 });
      }
      isRead = false;
    } else {
      const { error: insertError } = await supabase
        .from('read_articles')
        .insert({
          user_id: user.id,
          article_id: article_id,
        });

      if (insertError) {
        console.error('Error marking article as read:', insertError);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }
      isRead = true;
    }

    const { count } = await supabase
      .from('read_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const articleCount = count || 0;

    return NextResponse.json({ success: true, isRead, count: articleCount });
  } catch (error) {
    console.error('Error in POST /api/read-article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: readArticles, error } = await supabase
      .from('read_articles')
      .select('article_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching read articles:', error);
      return NextResponse.json({ error: 'Failed to fetch read articles' }, { status: 500 });
    }

    return NextResponse.json({ readArticles: readArticles || [] });
  } catch (error) {
    console.error('Error in GET /api/read-article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
