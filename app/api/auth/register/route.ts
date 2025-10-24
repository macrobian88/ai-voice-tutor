import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { User, COLLECTIONS } from '@/backend/src/models/database';
import { corsHeaders } from '@/lib/middleware';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Check if user exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409, headers: corsHeaders() }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const now = new Date();
    
    const newUser: User = {
      email,
      passwordHash,
      name,
      subscription: {
        tier: 'free',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      usage: {
        sessionsThisMonth: 0,
        minutesThisMonth: 0,
        lastResetDate: now,
      },
      preferences: {
        voiceId: 'alloy',
        voiceQuality: 'standard',
        subjects: [],
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId.toString();

    // Generate token
    const token = generateToken({
      userId,
      email,
      tier: 'free',
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: userId,
          email,
          name,
          tier: 'free',
        },
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
