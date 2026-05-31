<?php

final class Database
{
    public static function connect(): PDO
    {
        $configPath = __DIR__ . '/../config.php';

        if (!file_exists($configPath)) {
            throw new RuntimeException('Missing web/api/config.php. Copy config.example.php and set MySQL credentials.');
        }

        $config = require $configPath;
        return new PDO(
            $config['dsn'],
            $config['username'],
            $config['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
}
