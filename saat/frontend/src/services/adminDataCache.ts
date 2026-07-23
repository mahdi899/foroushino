import type { Agent, Team } from '@/types'

const USERS_TTL_MS = 10_000
const TEAMS_TTL_MS = 15_000

type CacheEntry<T> = {
  at: number
  data: T
}

let usersCache: CacheEntry<Agent[]> | null = null
let teamsCache: CacheEntry<Team[]> | null = null
let usersInflight: Promise<Agent[]> | null = null
let teamsInflight: Promise<Team[]> | null = null

export function isAdminUsersFresh(): boolean {
  return usersCache !== null && Date.now() - usersCache.at < USERS_TTL_MS
}

export function isAdminTeamsFresh(): boolean {
  return teamsCache !== null && Date.now() - teamsCache.at < TEAMS_TTL_MS
}

export function readCachedAdminUsers(): Agent[] | null {
  return isAdminUsersFresh() ? usersCache!.data : null
}

export function readCachedAdminTeams(): Team[] | null {
  return isAdminTeamsFresh() ? teamsCache!.data : null
}

export function writeCachedAdminUsers(agents: Agent[]): void {
  usersCache = { at: Date.now(), data: agents }
}

export function writeCachedAdminTeams(teams: Team[]): void {
  teamsCache = { at: Date.now(), data: teams }
}

export function invalidateAdminUsers(): void {
  usersCache = null
  usersInflight = null
}

export function invalidateAdminTeams(): void {
  teamsCache = null
  teamsInflight = null
}

export function invalidateAdminDirectory(): void {
  invalidateAdminUsers()
  invalidateAdminTeams()
}

export function getUsersInflight(): Promise<Agent[]> | null {
  return usersInflight
}

export function setUsersInflight(promise: Promise<Agent[]> | null): void {
  usersInflight = promise
}

export function getTeamsInflight(): Promise<Team[]> | null {
  return teamsInflight
}

export function setTeamsInflight(promise: Promise<Team[]> | null): void {
  teamsInflight = promise
}
