<?php

namespace App\Services;

use App\Enums\InAppNotificationType;
use App\Models\Article;
use App\Models\MiniCourse;
use App\Models\Notification as NotificationModel;
use App\Models\NotificationRecipient;
use App\Models\Order;
use App\Models\Product;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Central dispatch for in-app student panel notifications.
 */
class InAppNotificationService
{
    public function __construct(private readonly AudienceSegmentService $segments) {}

    public function notifyUser(
        User $user,
        string $title,
        string $body,
        InAppNotificationType|string $type,
        ?string $link = null,
        ?int $createdBy = null,
        ?string $linkLabel = null,
    ): NotificationRecipient {
        $notification = NotificationModel::create([
            'title' => $title,
            'body' => $body,
            'type' => $type instanceof InAppNotificationType ? $type->value : $type,
            'link' => $link,
            'link_label' => filled($link) ? $linkLabel : null,
            'created_by' => $createdBy,
        ]);

        return $notification->recipients()->create(['user_id' => $user->id]);
    }

    /** @param  Collection<int, User>|array<int, User>  $users */
    public function notifyUsers(
        Collection|array $users,
        string $title,
        string $body,
        InAppNotificationType|string $type,
        ?string $link = null,
        ?int $createdBy = null,
        ?string $linkLabel = null,
    ): NotificationModel {
        $users = $users instanceof Collection ? $users : collect($users);

        return DB::transaction(function () use ($users, $title, $body, $type, $link, $createdBy, $linkLabel) {
            $notification = NotificationModel::create([
                'title' => $title,
                'body' => $body,
                'type' => $type instanceof InAppNotificationType ? $type->value : $type,
                'link' => $link,
                'link_label' => filled($link) ? $linkLabel : null,
                'created_by' => $createdBy,
            ]);

            if ($users->isNotEmpty()) {
                $notification->recipients()->createMany(
                    $users->map(fn (User $user) => ['user_id' => $user->id])->all()
                );
            }

            return $notification;
        });
    }

    public function notifySegment(
        string $segment,
        string $title,
        string $body,
        InAppNotificationType|string $type = InAppNotificationType::General,
        ?string $link = null,
        ?int $createdBy = null,
        ?string $linkLabel = null,
    ): NotificationModel {
        return $this->notifyUsers(
            $this->segments->resolve($segment),
            $title,
            $body,
            $type,
            $link,
            $createdBy,
            $linkLabel,
        );
    }

    public function welcome(User $user): NotificationRecipient
    {
        return $this->notifyUser(
            $user,
            'به آکادمی بهرام رستمی خوش آمدی!',
            'خوشحالیم که همراه ما هستی. از داشبورد پنل کاربری‌ات شروع کن.',
            InAppNotificationType::Welcome,
            '/panel',
        );
    }

    public function orderPaid(Order $order): ?NotificationRecipient
    {
        $user = $this->orderUser($order);
        if (! $user) {
            return null;
        }

        $productTitle = $order->product?->title ?? 'محصول';
        $orderNumber = $order->order_number ?? (string) $order->id;

        return $this->notifyUser(
            $user,
            'پرداخت سفارش تأیید شد',
            "سفارش {$orderNumber} برای «{$productTitle}» با موفقیت پرداخت شد.",
            InAppNotificationType::OrderPaid,
            '/panel/orders',
        );
    }

    public function licenseReady(Order $order): ?NotificationRecipient
    {
        $user = $this->orderUser($order);
        if (! $user) {
            return null;
        }

        $productTitle = $order->product?->title ?? 'دوره';

        return $this->notifyUser(
            $user,
            'لایسنس دوره آماده است',
            "لایسنس «{$productTitle}» صادر شد. از بخش دوره‌ها می‌توانی مشاهده و پخش کنی.",
            InAppNotificationType::LicenseReady,
            '/panel/courses',
        );
    }

    public function miniCourseEnrolled(User $user, MiniCourse $course, Order $order): NotificationRecipient
    {
        $orderNumber = $order->order_number ?? (string) $order->id;
        $slug = $course->slug;

        return $this->notifyUser(
            $user,
            'مینی‌دوره برای شما فعال شد',
            "«{$course->title}» با شماره سفارش {$orderNumber} در پنل شما ثبت شد. از بخش دوره‌ها می‌توانی تماشا کنی.",
            InAppNotificationType::MiniCourseEnrolled,
            filled($slug) ? "/panel/mini-courses/{$slug}/watch" : '/panel/courses',
        );
    }

    public function ticketCreated(Ticket $ticket): ?NotificationRecipient
    {
        $user = $ticket->user;
        if (! $user) {
            return null;
        }

        return $this->notifyUser(
            $user,
            'تیکت پشتیبانی ثبت شد',
            "تیکت «{$ticket->subject}» با موفقیت ثبت شد. به‌زودی پاسخ می‌دهیم.",
            InAppNotificationType::TicketCreated,
            "/panel/support/{$ticket->id}",
        );
    }

    public function ticketReply(Ticket $ticket): ?NotificationRecipient
    {
        $user = $ticket->user;
        if (! $user) {
            return null;
        }

        return $this->notifyUser(
            $user,
            'پاسخ جدید برای تیکت شما',
            "پشتیبانی به تیکت «{$ticket->subject}» پاسخ داد.",
            InAppNotificationType::TicketReply,
            "/panel/support/{$ticket->id}",
        );
    }

    public function newProduct(Product $product, ?int $createdBy = null): ?NotificationModel
    {
        if (! $product->is_active) {
            return null;
        }

        $link = filled($product->landing_href)
            ? $product->landing_href
            : '/courses/'.$product->slug;

        return $this->notifySegment(
            'all_students',
            'محصول جدید در آکادمی',
            "«{$product->title}» به فروشگاه اضافه شد.",
            InAppNotificationType::ProductNew,
            $link,
            $createdBy,
        );
    }

    public function newArticle(Article $article, ?int $createdBy = null): ?NotificationModel
    {
        if ($article->status !== 'published') {
            return null;
        }

        return $this->notifySegment(
            'all_students',
            'مطلب جدید منتشر شد',
            "«{$article->title}» در بخش مقالات منتشر شد.",
            InAppNotificationType::ArticleNew,
            '/insights/'.$article->slug,
            $createdBy,
        );
    }

    public function identityApproved(User $user): NotificationRecipient
    {
        return $this->notifyUser(
            $user,
            'هویت شما تأیید شد',
            'پرونده تأیید هویت شما بررسی و تأیید شد. اکنون می‌توانید از امکانات ویژه حساب استفاده کنید.',
            InAppNotificationType::IdentityApproved,
            '/panel/profile',
        );
    }

    public function identityRejected(User $user): NotificationRecipient
    {
        return $this->notifyUser(
            $user,
            'پرونده تأیید هویت رد شد',
            'متأسفانه پرونده تأیید هویت شما تأیید نشد. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
            InAppNotificationType::IdentityRejected,
            '/panel/identity-verification',
        );
    }

    public function identityNeedsCorrection(User $user): NotificationRecipient
    {
        return $this->notifyUser(
            $user,
            'اصلاح مدارک تأیید هویت',
            'برخی موارد پرونده شما نیاز به اصلاح دارد. لطفاً مدارک را به‌روز و دوباره ارسال کنید.',
            InAppNotificationType::IdentityNeedsCorrection,
            '/panel/identity-verification',
        );
    }

    private function orderUser(Order $order): ?User
    {
        if (! $order->user_id) {
            return null;
        }

        return $order->relationLoaded('user')
            ? $order->user
            : User::query()->find($order->user_id);
    }
}
