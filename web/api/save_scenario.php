<?php

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/lib/Database.php';

function slugify(string $name): string
{
    $slug = strtolower(trim($name));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? 'scenario';
    $slug = trim($slug, '-');
    return $slug !== '' ? $slug : 'scenario';
}

function saveScenarioToJsonFile(string $name, array $users, array $messages): array
{
    $storageDir = realpath(__DIR__ . '/../storage');
    if ($storageDir === false) {
        $storageDir = __DIR__ . '/../storage';
        mkdir($storageDir, 0775, true);
    }

    $scenarioDir = $storageDir . '/scenarios';
    if (!is_dir($scenarioDir)) {
        mkdir($scenarioDir, 0775, true);
    }

    $timestamp = gmdate('Ymd-His');
    $filename = $timestamp . '-' . slugify($name) . '.json';
    $path = $scenarioDir . '/' . $filename;

    $record = [
        'name' => $name,
        'users' => $users,
        'messages' => $messages,
        'created_at' => gmdate('c'),
        'storage' => 'json-file',
    ];

    file_put_contents(
        $path,
        json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
    );

    return [
        'ok' => true,
        'storage' => 'json-file',
        'file' => $filename,
        'path' => $path,
    ];
}

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

    if (!file_exists(__DIR__ . '/config.php')) {
        echo json_encode(saveScenarioToJsonFile($name, $users, $messages));
        exit;
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

    echo json_encode([
        'ok' => true,
        'storage' => 'mysql',
        'id' => (int)$pdo->lastInsertId(),
        'path' => 'MySQL table: toy_signal.scenarios',
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
}
