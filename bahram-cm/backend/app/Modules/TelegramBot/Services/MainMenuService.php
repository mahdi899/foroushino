<?php



namespace App\Modules\TelegramBot\Services;



class MainMenuService

{

    public function __construct(

        private readonly MainMenuKeyboard $keyboard,

    ) {}



    /** @return array<string, mixed> */

    public function replyMarkup(): array

    {

        return $this->keyboard->replyMarkup();

    }



    public function isMenuButton(string $text): bool

    {

        return $this->keyboard->isMenuButton($text);

    }

}

