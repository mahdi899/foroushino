<?php



namespace App\Modules\TelegramBot\Services;



use App\Modules\TelegramBot\Exceptions\InvalidTelegramInitDataException;

use App\Modules\TelegramBot\Models\TelegramBot;



class MiniAppInitDataVerifier

{

    public function __construct(

        private readonly MiniAppAuthService $auth,

    ) {}



    /**

     * @return array{id: int, first_name: string, last_name: ?string, username: ?string, photo_url: ?string}

     *

     * @throws InvalidTelegramInitDataException

     */

    public function verify(TelegramBot $bot, string $initData): array

    {

        return $this->auth->verify($bot, $initData);

    }

}

