import { describe, expect, it } from 'bun:test'

import { emojiCommand, stickerCommand } from './index'

describe('expression commands', () => {
  it('registers emoji list, create and delete', () => {
    expect(emojiCommand.name()).toBe('emoji')
    expect(emojiCommand.commands.map((command) => command.name()).sort()).toEqual(['create', 'delete', 'list'])
  })

  it('registers sticker list, create and delete', () => {
    expect(stickerCommand.name()).toBe('sticker')
    expect(stickerCommand.commands.map((command) => command.name()).sort()).toEqual(['create', 'delete', 'list'])
  })

  it('requires tags when creating a sticker', () => {
    const create = stickerCommand.commands.find((command) => command.name() === 'create')

    expect(create?.options.find((option) => option.long === '--tags')?.required).toBe(true)
  })
})
