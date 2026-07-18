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

const BASE_URL = process.env.TELEGRAM_APP_URL || 'https://satcall.ir'
const APP_NAME = process.env.APP_NAME || 'سات'

const versionedUrl = `${BASE_URL}/?v=${version}`

console.log('\n' + '='.repeat(60))
console.log(`${APP_NAME} — Telegram Link Generator`)
console.log('='.repeat(60))
console.log(`Package Version: ${packageJson.version}`)
console.log(`URL Version: ${version}`)
console.log(`Build Hash: ${buildHash}`)
console.log('\n' + '─'.repeat(60))
console.log('TELEGRAM MINI APP URL:')
console.log('─'.repeat(60))
console.log(`\n${versionedUrl}\n`)
console.log('─'.repeat(60))
console.log('BOTFATHER:')
console.log('─'.repeat(60))
console.log('\n1. Open @BotFather')
console.log('2. /mybots → select bot → Bot Settings → Menu Button / Configure Mini App')
console.log(`3. Web App URL: ${BASE_URL}`)
console.log('4. /setdomain →')
console.log(`   ${BASE_URL.replace(/^https?:\/\//, '')}`)
console.log('\n' + '='.repeat(60))

const outputPath = path.join(__dirname, '../telegram-link.txt')
const content = `Telegram Mini App Link - Generated ${new Date().toISOString()}
===============================================
App: ${APP_NAME}
Version: ${packageJson.version}
Build Hash: ${buildHash}

TELEGRAM URL:
${versionedUrl}

WEB APP URL (BotFather):
${BASE_URL}

DOMAIN:
${BASE_URL.replace(/^https?:\/\//, '')}
`
fs.writeFileSync(outputPath, content)
console.log(`\nSaved to: telegram-link.txt\n`)
