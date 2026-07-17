<?php

namespace App\Models;

use App\Enums\Availability;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected $attributes = [
        'call_goal' => 25,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'avatar',
        'telegram_id',
        'team_id',
        'level',
        'points',
        'streak',
        'call_goal',
        'sale_goal',
        'availability',
        'availability_changed_at',
        'is_active',
        'mask_phone_numbers',
        'referral_code',
        'bank_card',
        'bank_card_confirmed_at',
        'bank_sheba',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'availability' => Availability::class,
            'availability_changed_at' => 'datetime',
            'is_active' => 'boolean',
            'mask_phone_numbers' => 'boolean',
            'bank_card_confirmed_at' => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function ledTeam(): HasOne
    {
        return $this->hasOne(Team::class, 'leader_id');
    }

    public function supervisedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'supervisor_id');
    }

    public function assignedLeads(): HasMany
    {
        return $this->hasMany(Lead::class, 'assigned_agent_id');
    }

    public function calls(): HasMany
    {
        return $this->hasMany(Call::class, 'agent_id');
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class, 'agent_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'agent_id');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(Commission::class, 'agent_id');
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function payoutRequests(): HasMany
    {
        return $this->hasMany(PayoutRequest::class);
    }

    public function appNotifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function dailyTargets(): HasMany
    {
        return $this->hasMany(DailyTarget::class);
    }

    public function workSessions(): HasMany
    {
        return $this->hasMany(UserWorkSession::class);
    }

    public function performanceSnapshots(): HasMany
    {
        return $this->hasMany(PerformanceSnapshot::class);
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(UserAchievement::class);
    }

    public function lockedLeads(): HasMany
    {
        return $this->hasMany(Lead::class, 'locked_by');
    }

    public function ensureReferralCode(): string
    {
        if (filled($this->referral_code)) {
            return (string) $this->referral_code;
        }

        $code = self::generateUniqueReferralCode();
        $this->forceFill(['referral_code' => $code])->save();

        return $code;
    }

    public static function generateUniqueReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(5));
        } while (self::query()->where('referral_code', $code)->exists());

        return $code;
    }

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (blank($user->referral_code)) {
                $user->referral_code = self::generateUniqueReferralCode();
            }
        });
    }
}
