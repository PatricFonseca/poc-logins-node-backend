import { Controller, Get, Query, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import axios from 'axios';
import qs from 'qs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

@Controller('auth')
export class AuthController {
  private sessionCookieName = 'session_token';

  @Get('google')
  async redirectToGoogle(@Res() res: Response) {
    const state = crypto.randomBytes(16).toString('hex');

    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      signed: true,
      maxAge: 1000 * 60 * 5 // 5 minutos
    });

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email profile',
      state
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  @Get('callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!code) {
        throw new HttpException('Authorization code not provided', HttpStatus.BAD_REQUEST);
      }

      const cookieState = req.signedCookies?.['oauth_state'];
      if (!cookieState || cookieState !== state) {
        throw new HttpException('Invalid state parameter', HttpStatus.UNAUTHORIZED);
      }
      res.clearCookie('oauth_state');

      // Troca code por tokens
      const tokenResp = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token } = tokenResp.data;

      if (!access_token) {
        throw new HttpException('Failed to obtain access token', HttpStatus.UNAUTHORIZED);
      }

      // Busca perfil
      const userResp = await axios.get(
        'https://openidconnect.googleapis.com/v1/userinfo',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const user = userResp.data;

      if (!user.sub || !user.email) {
        throw new HttpException('Failed to get user information', HttpStatus.UNAUTHORIZED);
      }

      // Cria sessão JWT
      const appJwt = jwt.sign(
        {
          sub: user.sub,
          email: user.email,
          name: user.name,
          picture: user.picture,
          provider: 'google'
        },
        process.env.COOKIE_SECRET!,
        { expiresIn: '7d' }
      );

      res.cookie(this.sessionCookieName, appJwt, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // true em produção HTTPS
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      // Redireciona para home do frontend já logado
      res.redirect(process.env.CORS_ORIGIN || 'http://localhost:5173');
    } catch (error) {
      console.error('Google OAuth callback error:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        console.error('Google API error:', error.response?.data);
        throw new HttpException('Google authentication failed', HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    try {
      const token = req.signedCookies?.[this.sessionCookieName];

      if (!token) {
        throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const decoded = jwt.verify(token, process.env.COOKIE_SECRET!) as any;

      return {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        provider: decoded.provider
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }
      throw error;
    }
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie(this.sessionCookieName);
    res.json({ message: 'Logged out successfully' });
  }
}
