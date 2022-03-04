import { Octokit } from 'octokit'
import moment from 'moment'
import util from 'util'

async function main() {
  const { author, weekNumber } = getArgs()
  const { start, end } = getWeekBounds(weekNumber)

  const spinner = startSpinner()

  const octokit = new Octokit({
    auth: ''
  })

  const repoList = await getRepoList(octokit)
  const repoCommits = await Promise.all(
    repoList.map((repo) => getCommits(octokit, repo, author, start, end))
  )

  const commitList = await getCommitListWithStats(octokit, repoCommits)

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

async function getRepoList(octokit) {
  const { data: repos } = await octokit.rest.repos.listForOrg({
    org: 'ResearchAffiliates'
  })

  return repos.map((r) => r.name)
}

async function getCommits(octokit, repo, author, since, until) {
  let commits = []

  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner: 'ResearchAffiliates',
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

async function getCommitListWithStats(octokit, repoCommits) {
  const list = repoCommits.flat()
  const commitMap = list.reduce((map, commit) => {
    map[commit.sha] = commit
    return map
  }, {})

  const responses = await Promise.all(
    list.map(({ repo, sha: ref }) =>
      octokit.rest.repos.getCommit({ owner: 'ResearchAffiliates', repo, ref })
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
