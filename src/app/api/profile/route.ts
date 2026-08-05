import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  target_exam: z.enum(['CET4', 'CET6']).optional(),
  major_category: z.string().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Error in GET /api/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (!parsed.data.target_exam && !parsed.data.major_category) {
      return NextResponse.json(
        { error: 'At least one field (target_exam or major_category) is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (parsed.data.target_exam) {
      updateData.target_exam = parsed.data.target_exam;
    }
    if (parsed.data.major_category) {
      updateData.major_category = parsed.data.major_category;
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existingProfile) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        updated_at: updateData.updated_at,
      };
      
      if (parsed.data.target_exam) {
        insertData.target_exam = parsed.data.target_exam;
      } else {
        insertData.target_exam = 'CET4';
      }
      
      if (parsed.data.major_category) {
        insertData.major_category = parsed.data.major_category;
      } else {
        insertData.major_category = '综合';
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .insert(insertData)
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Error updating profile:', result.error);
      return NextResponse.json(
        { error: 'Failed to update profile', details: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in POST /api/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
