#!/usr/bin/env node

/**
 * Generate Telegram Mini App versioned link for BotFather.
 * Usage: node scripts/generate-telegram-link.js [version]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packagePath = path.join(__dirname, '../package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

let version = process.argv[2]
if (!version) {
  const semver = packageJson.version || '1.0.0'
  version = semver.replace(/\./g, '')
}

const versionJsonPath = path.join(__dirname, '../public/version.json')
let buildHash = ''
try {
  const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
  buildHash = versionJson.buildHash || ''
} catch {
  console.warn('Warning: Could not read version.json')
}

const BASE_URL = process.env.TELEGRAM_APP_URL || 'https://sat.center'
const APP_NAME = process.env.APP_NAME || 'سات'
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'RostamiAppBot'
const MINI_APP_SHORT_NAME = process.env.TELEGRAM_MINI_APP_SHORT_NAME || 'satcenter'

const versionedUrl = `${BASE_URL}/?v=${version}`
const directLink = `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}`

console.log('\n' + '='.repeat(60))
console.log(`${APP_NAME} — Telegram Link Generator`)
console.log('='.repeat(60))
console.log(`Package Version: ${packageJson.version}`)
console.log(`URL Version: ${version}`)
console.log(`Build Hash: ${buildHash}`)
console.log('\n' + '─'.repeat(60))
console.log('TELEGRAM MINI APP DIRECT LINK:')
console.log('─'.repeat(60))
console.log(`\n${directLink}\n`)
console.log('─'.repeat(60))
console.log('WEB APP URL (cache-busted for manual sharing):')
console.log('─'.repeat(60))
console.log(`\n${versionedUrl}\n`)
console.log('─'.repeat(60))
console.log('BOTFATHER (already configured — for reference only):')
console.log('─'.repeat(60))
console.log(`\nBot: @${BOT_USERNAME} (t.me/${BOT_USERNAME})`)
console.log(`Mini App short name: ${MINI_APP_SHORT_NAME}`)
console.log(`Web App URL: ${BASE_URL}/`)
console.log(`/setdomain → ${BASE_URL.replace(/^https?:\/\//, '')}`)
console.log('\n' + '='.repeat(60))

const outputPath = path.join(__dirname, '../telegram-link.txt')
const content = `Telegram Mini App Link - Generated ${new Date().toISOString()}
===============================================
App: ${APP_NAME}
Version: ${packageJson.version}
Build Hash: ${buildHash}

BOT: @${BOT_USERNAME}
MINI APP SHORT NAME: ${MINI_APP_SHORT_NAME}

DIRECT LINK:
${directLink}

WEB APP URL (BotFather):
${BASE_URL}/

VERSIONED URL:
${versionedUrl}

DOMAIN:
${BASE_URL.replace(/^https?:\/\//, '')}
`
fs.writeFileSync(outputPath, content)
console.log(`\nSaved to: telegram-link.txt\n`)
