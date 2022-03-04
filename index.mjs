import { Octokit } from 'octokit'
import moment from 'moment'
import util from 'util'
import fs from 'fs'

async function main() {
  const { author, weekNumber } = getArgs()
  const { start, end } = getWeekBounds(weekNumber)
  const { org, auth } = getConfig()

  const spinner = startSpinner()
  const octokit = new Octokit({ auth })

  const repoList = await getRepoList(octokit, org)
  const repoCommits = await Promise.all(
    repoList.map((repo) => getCommits(octokit, org, repo, author, start, end))
  )

  const commitList = await getCommitListWithStats(octokit, org, repoCommits)

  stopSpinner(spinner)

  process.stdout.write(`\r${util.format(commitList)}`)
}

function getArgs() {
  const args = process.argv.slice(2)
  return {
    author: args[0],
    weekNumber: Number(args[1])
  }
}

function getWeekBounds(weekNumber) {
  const week = moment().weeks(weekNumber)
  const start = week
    .day(0)
    .utc()
    .hour(0)
    .minute(0)
    .second(0)
    .millisecond(0)
    .toDate()
  const end = week
    .day(7)
    .utc()
    .hour(0)
    .minute(0)
    .second(0)
    .millisecond(0)
    .toDate()

  return { start, end }
}

function getConfig() {
  const json = fs.readFileSync('config.json')
  return JSON.parse(json)
}

async function getRepoList(octokit, org) {
  const { data: repos } = await octokit.rest.repos.listForOrg({ org })
  return repos.map((r) => r.name)
}

async function getCommits(octokit, owner, repo, author, since, until) {
  let commits = []

  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      author,
      since,
      until
    })

    commits = data.map((c) => ({
      repo,
      sha: c.sha,
      date: c.commit.committer.date,
      name: c.commit.committer.name,
      message: c.commit.message,
      url: c.url
    }))
  } catch (error) {
    // 409: empty repo, that's okay
    if (error.status !== 409) {
      throw new Error(`Error while retrieving commits for ${repo} repo`)
    }
  }

  return commits
}

async function getCommitListWithStats(octokit, owner, repoCommits) {
  const list = repoCommits.flat()
  const commitMap = list.reduce((map, commit) => {
    map[commit.sha] = commit
    return map
  }, {})

  const responses = await Promise.all(
    list.map(({ repo, sha: ref }) =>
      octokit.rest.repos.getCommit({ owner, repo, ref })
    )
  )

  responses
    .map((response) => response.data)
    .map((commit) => (commitMap[commit.sha].stats = commit.stats))

  return list
}

function startSpinner() {
  const P = ['\\', '|', '/', '-']
  let x = 0

  return setInterval(() => {
    process.stdout.write(`\rRetrieving commits between X and Y ${P[x++]}`)
    x %= P.length
  }, 250)
}

function stopSpinner(spinner) {
  clearInterval(spinner)
}

main()
