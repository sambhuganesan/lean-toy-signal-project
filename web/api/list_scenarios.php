<?php

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/lib/Database.php';

try {
    $pdo = Database::connect();
    $stmt = $pdo->query(
        'SELECT id, name, users_json, messages_json, created_at
         FROM scenarios
         ORDER BY created_at DESC
         LIMIT 10'
    );

    $scenarios = array_map(static function (array $row): array {
        return [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'users' => json_decode($row['users_json'], true),
            'messages' => json_decode($row['messages_json'], true),
            'created_at' => $row['created_at'],
        ];
    }, $stmt->fetchAll());

    echo json_encode(['ok' => true, 'scenarios' => $scenarios]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
}
