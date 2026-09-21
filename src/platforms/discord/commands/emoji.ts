import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { contentTypeFor, validateEmojiImage, validateEmojiName } from '../expression-validation'

async function authenticate(options: { pretty?: boolean }): Promise<DiscordClient> {
  const credManager = new DiscordCredentialManager()
  const config = await credManager.load()

  if (!config.token) {
    console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
    process.exit(1)
  }

  return new DiscordClient().login({ token: config.token })
}

function fail(message: string, options: { pretty?: boolean }): never {
  console.log(formatOutput({ error: message }, options.pretty))
  return process.exit(1)
}

export async function listAction(serverId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const client = await authenticate(options)
    const emojis = await client.listEmojis(serverId)
    const staticCount = emojis.filter((emoji) => !emoji.animated).length

    console.log(
      formatOutput(
        {
          server_id: serverId,
          count: emojis.length,
          static_count: staticCount,
          animated_count: emojis.length - staticCount,
          emojis: emojis.map((emoji) => ({ id: emoji.id, name: emoji.name, animated: emoji.animated ?? false })),
        },
        options.pretty,
      ),
    )
  } catch (error) {
    handleError(error as Error)
  }
}

export async function createAction(
  serverId: string,
  filePath: string,
  options: { name?: string; pretty?: boolean },
): Promise<void> {
  const filename = basename(filePath)
  const name = options.name ?? basename(filename, extname(filename))

  const nameError = validateEmojiName(name)
  if (nameError) fail(nameError, options)

  let image: Uint8Array
  try {
    image = new Uint8Array(await readFile(filePath))
  } catch (error) {
    return handleError(error as Error)
  }

  const imageError = validateEmojiImage(filename, image)
  if (imageError) fail(imageError, options)

  try {
    const client = await authenticate(options)
    const emoji = await client.createEmoji(serverId, name, image, contentTypeFor(filename), [])

    console.log(formatOutput({ success: true, server_id: serverId, id: emoji.id, name: emoji.name }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function deleteAction(serverId: string, emojiId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const client = await authenticate(options)
    await client.deleteEmoji(serverId, emojiId)

    console.log(formatOutput({ success: true, server_id: serverId, id: emojiId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const emojiCommand = new Command('emoji')
  .description('Custom emoji commands')
  .addCommand(
    new Command('list')
      .description('List custom emoji in a server')
      .argument('<server-id>', 'Server ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('create')
      .description('Upload a custom emoji to a server')
      .argument('<server-id>', 'Server ID')
      .argument('<file>', 'Image file (PNG, JPEG, GIF or WebP, max 256KB)')
      .option('--name <name>', 'Emoji name (defaults to the filename without extension)')
      .option('--pretty', 'Pretty print JSON output')
      .action(createAction),
  )
  .addCommand(
    new Command('delete')
      .description('Delete a custom emoji from a server')
      .argument('<server-id>', 'Server ID')
      .argument('<emoji-id>', 'Emoji ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(deleteAction),
  )
