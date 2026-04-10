import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import string from '@adonisjs/core/helpers/string'

export default class PasswordReset extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  /**
   * Generate a secure random token
   */
  static generateToken(): string {
    return string.random(64)
  }

  /**
   * Check if the token has expired
   */
  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  /**
   * Create a password reset record for an email
   * Deletes any existing tokens for the same email
   */
  static async createForEmail(email: string): Promise<PasswordReset> {
    // Delete any existing tokens for this email
    await this.query().where('email', email.toLowerCase()).delete()

    // Create new token with 1 hour expiry
    return await this.create({
      email: email.toLowerCase(),
      token: this.generateToken(),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })
  }

  /**
   * Find a valid (non-expired) token
   */
  static async findValidToken(email: string, token: string): Promise<PasswordReset | null> {
    const record = await this.query()
      .where('email', email.toLowerCase())
      .where('token', token)
      .where('expires_at', '>', DateTime.now().toSQL())
      .first()

    return record
  }
}