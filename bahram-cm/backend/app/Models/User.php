<?php

namespace App\Models;

use App\Enums\AdminRoleName;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'mobile',
        'email',
        'password',
        'status',
        'spotplayer_x',
        'is_admin',
        'admin_login_otp_exempt',
        'is_root_admin',
        'is_sat_staff',
        'sat_leader_id',
        'mobile_verified_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'spotplayer_x',
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
            'admin_login_otp_exempt' => 'boolean',
            'is_root_admin' => 'boolean',
            'is_sat_staff' => 'boolean',
            'status' => UserStatus::class,
            'onboarding_progress' => 'array',
        ];
    }

    public function hasPermission(string $permission): bool
    {
        if (! $this->is_admin) {
            return false;
        }

        if ($this->isRootAdmin() || $this->isSuperAdmin()) {
            return true;
        }

        return $this->can($permission);
    }

    public function isRootAdmin(): bool
    {
        return $this->is_admin && $this->is_root_admin;
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_admin && $this->hasRole(AdminRoleName::SuperAdmin->value);
    }

    /** A student is any non-admin, non-sat-staff account identified by mobile. */
    public function isStudent(): bool
    {
        return ! $this->is_admin && ! $this->is_sat_staff;
    }

    public function satLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sat_leader_id');
    }

    public function satSpecialists(): HasMany
    {
        return $this->hasMany(User::class, 'sat_leader_id')
            ->where('is_sat_staff', true);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function identityProfile(): HasOne
    {
        return $this->hasOne(UserIdentityProfile::class);
    }

    public function satMembership(): HasOne
    {
        return $this->hasOne(SatMembership::class);
    }

    public function identityVerificationSubmissions(): HasMany
    {
        return $this->hasMany(IdentityVerificationSubmission::class);
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

    public function verifiedBankAccounts(): HasMany
    {
        return $this->hasMany(VerifiedBankAccount::class);
    }

    public function seminarAttendances(): HasMany
    {
        return $this->hasMany(SeminarAttendee::class);
    }

    public function miniCourseEnrollments(): HasMany
    {
        return $this->hasMany(MiniCourseEnrollment::class);
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

    public function familyMembership(): HasOne
    {
        return $this->hasOne(FamilyMembership::class);
    }
}
