<?php

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/lib/Database.php';

function listJsonScenarios(): array
{
    $scenarioDir = realpath(__DIR__ . '/../storage/scenarios');
    if ($scenarioDir === false) {
        return [];
    }

    $files = glob($scenarioDir . '/*.json') ?: [];
    rsort($files);

    return array_map(static function (string $path): array {
        $data = json_decode(file_get_contents($path), true) ?: [];
        return [
            'id' => basename($path, '.json'),
            'name' => $data['name'] ?? basename($path),
            'users' => $data['users'] ?? [],
            'messages' => $data['messages'] ?? [],
            'created_at' => $data['created_at'] ?? null,
            'storage' => 'json-file',
            'path' => $path,
        ];
    }, array_slice($files, 0, 10));
}

try {
    if (!file_exists(__DIR__ . '/config.php')) {
        echo json_encode([
            'ok' => true,
            'storage' => 'json-file',
            'scenarios' => listJsonScenarios(),
        ]);
        exit;
    }

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
            'storage' => 'mysql',
            'path' => 'MySQL table: toy_signal.scenarios',
        ];
    }, $stmt->fetchAll());

    echo json_encode(['ok' => true, 'storage' => 'mysql', 'scenarios' => $scenarios]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
}
