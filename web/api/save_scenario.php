<?php

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/lib/Database.php';

try {
    $payload = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    $name = trim((string)($payload['name'] ?? 'Untitled scenario'));
    $users = $payload['users'] ?? [];
    $messages = $payload['messages'] ?? [];

    if ($name === '') {
        $name = 'Untitled scenario';
    }

    if (!is_array($users) || !is_array($messages)) {
        throw new InvalidArgumentException('Invalid scenario payload.');
    }

    $pdo = Database::connect();
    $stmt = $pdo->prepare(
        'INSERT INTO scenarios (name, users_json, messages_json, created_at)
         VALUES (:name, :users_json, :messages_json, NOW())'
    );
    $stmt->execute([
        ':name' => $name,
        ':users_json' => json_encode($users, JSON_THROW_ON_ERROR),
        ':messages_json' => json_encode($messages, JSON_THROW_ON_ERROR),
    ]);

    echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
}
