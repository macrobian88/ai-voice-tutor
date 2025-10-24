import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { User, COLLECTIONS } from '@/backend/src/models/database';
import { corsHeaders } from '@/lib/middleware';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Find user
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
    );

    // Generate token
    const token = generateToken({
      userId: user._id!.toString(),
      email: user.email,
      tier: user.subscription.tier,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
          tier: user.subscription.tier,
          currentLearningPath: user.currentLearningPath,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
