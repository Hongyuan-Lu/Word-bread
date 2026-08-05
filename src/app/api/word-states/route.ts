import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const UpsertWordStateSchema = z.object({
  lemma: z.string().min(1).transform(v => v.trim().toLowerCase()),
  vocab_type: z.enum(['study_plan', 'difficult']),
  word_id: z.string().uuid().nullable().optional(),
  gloss_snapshot: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('user_word_states')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching word states:', error);
      return NextResponse.json(
        { error: 'Failed to fetch word states' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/word-states:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = UpsertWordStateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lemma, vocab_type, word_id, gloss_snapshot } = parsed.data;

    const { data, error } = await supabase
      .from('user_word_states')
      .upsert(
        {
          user_id: user.id,
          lemma,
          vocab_type,
          updated_at: new Date().toISOString(),
          word_id: word_id ?? null,
          gloss_snapshot: gloss_snapshot ?? null,
        },
        {
          onConflict: 'user_id,lemma',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting word state:', error);
      return NextResponse.json(
        { error: 'Failed to update word state', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/word-states:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lemma = searchParams.get('lemma');

    if (!lemma) {
      return NextResponse.json(
        { error: 'Lemma is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_word_states')
      .delete()
      .eq('user_id', user.id)
      .eq('lemma', lemma.trim().toLowerCase());

    if (error) {
      console.error('Error deleting word state:', error);
      return NextResponse.json(
        { error: 'Failed to delete word state' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/word-states:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
