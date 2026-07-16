<?php



namespace App\Modules\TelegramBot\Services;



use App\Modules\TelegramBot\Models\TelegramAccount;

use App\Modules\TelegramBot\Models\TelegramBot;



class RequiredChatGateService

{

    public function __construct(

        private readonly RequiredChatMembershipService $membership,

    ) {}



    public function isSatisfied(TelegramBot $bot, TelegramAccount $account): bool

    {

        return $this->membership->isSatisfied($bot, $account);

    }



    public function promptJoin(TelegramBot $bot, TelegramAccount $account): void

    {

        $this->membership->promptJoin($bot, $account);

    }

}

