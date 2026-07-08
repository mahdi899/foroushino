<?php

namespace App\Enums;

enum InAppNotificationType: string
{
    case Welcome = 'welcome';
    case General = 'general';
    case OrderPaid = 'order_paid';
    case LicenseReady = 'license_ready';
    case TicketCreated = 'ticket_created';
    case TicketReply = 'ticket_reply';
    case ProductNew = 'product_new';
    case ArticleNew = 'article_new';
}
