import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('Session check:', { user: user?.id, error });
    
    if (error || !user) {
      return NextResponse.json(
        { user: null, error: error?.message },
        { status: 200 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/session:', error);
    return NextResponse.json(
      { user: null, error: String(error) },
      { status: 200 }
    );
  }
}
