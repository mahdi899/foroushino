<?php



namespace App\Modules\TelegramBot\Jobs;



/**

 * Alias for {@see SendTelegramMessageJob} — outbound replies use the replies queue.

 */

class SendTelegramReplyJob extends SendTelegramMessageJob

{

}

