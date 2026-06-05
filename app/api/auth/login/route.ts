import { NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { z } from 'zod';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function secretHash(username: string, clientId: string, clientSecret: string): string {
  return createHmac('sha256', clientSecret).update(username + clientId).digest('base64');
}

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  const region = process.env.COGNITO_REGION ?? 'ap-south-1';

  if (!clientId) {
    return NextResponse.json({ error: 'Cognito not configured' }, { status: 500 });
  }

  const authParameters: Record<string, string> = {
    USERNAME: parsed.email,
    PASSWORD: parsed.password,
  };
  if (clientSecret) {
    authParameters.SECRET_HASH = secretHash(parsed.email, clientId, clientSecret);
  }

  const client = new CognitoIdentityProviderClient({ region });

  try {
    const result = await client.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: authParameters,
      }),
    );

    const idToken = result.AuthenticationResult?.IdToken;
    if (!idToken) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('id_token', idToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: result.AuthenticationResult?.ExpiresIn ?? 3600,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === 'NotAuthorizedException' || name === 'UserNotFoundException') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (name === 'UserNotConfirmedException') {
      return NextResponse.json({ error: 'Account not confirmed' }, { status: 401 });
    }
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
