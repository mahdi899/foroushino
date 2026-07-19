<?php

namespace Tests\Unit\Media;

use App\Support\MediaFtpConnection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaFtpConnectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_save_persists_ftp_connection_settings(): void
    {
        MediaFtpConnection::save([
            'enabled' => true,
            'protocol' => 'ftp',
            'host' => 'ftp.example.com',
            'port' => 21,
            'username' => 'user',
            'password' => 'secret',
            'root' => '/public_html',
        ]);

        $view = MediaFtpConnection::publicView();

        $this->assertTrue($view['enabled']);
        $this->assertSame('ftp.example.com', $view['host']);
        $this->assertSame('/public_html', $view['root']);
        $this->assertSame('site_media_ftp', $view['disk_name']);
    }
}
