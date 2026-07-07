<?php

namespace App\Models;

use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'mobile',
        'email',
        'password',
        'is_admin',
        'status',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'mobile_verified_at' => 'datetime',
            'first_login_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'status' => UserStatus::class,
            'onboarding_progress' => 'array',
        ];
    }

    public function hasPermission(string $permission): bool
    {
        return (bool) $this->is_admin;
    }

    /** A student is any non-admin account identified by mobile. */
    public function isStudent(): bool
    {
        return ! $this->is_admin;
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function courseAccesses(): HasMany
    {
        return $this->hasMany(CourseAccess::class);
    }

    public function spotplayerLicenses(): HasMany
    {
        return $this->hasMany(SpotplayerLicense::class);
    }

    public function referralCode(): HasOne
    {
        return $this->hasOne(ReferralCode::class);
    }

    public function referralConversionsAsReferrer(): HasMany
    {
        return $this->hasMany(ReferralConversion::class, 'referrer_user_id');
    }

    public function cashbackPayouts(): HasMany
    {
        return $this->hasMany(CashbackPayout::class);
    }

    public function seminarAttendances(): HasMany
    {
        return $this->hasMany(SeminarAttendee::class);
    }

    public function satApplications(): HasMany
    {
        return $this->hasMany(SatApplication::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function notificationRecipients(): HasMany
    {
        return $this->hasMany(NotificationRecipient::class);
    }
}
