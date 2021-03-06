#! /usr/bin/env node

var Github = require('github-api')
var async = require('async')
var request = require('request')
var fs = require('fs')

var githubToken = process.argv[2]
var orgName = process.argv[3]

if (!githubToken.length) {
  console.log('Missing Github token.')
  process.exit(0)
}

var github = new Github({
  token: githubToken,
  auth: 'oauth'
})

var user = github.getUser()
user.orgRepos(orgName, function (err, repos) {
  if (err) {
    console.log(JSON.parse(err.request.responseText).message)
    process.exit(0)
  }

  async.map(repos, readBranches, function (err, results) {
    if (err) {
      console.log(err)
      process.exit(0)
    }
    var merged = [].concat.apply([], results)
    async.map(merged, downloadFile)
  })
})

function downloadFile (data, cb) {
  var repoName = data.repoName
  var branchName = data.branchName
  request({
    url: 'https://' + orgName + ':' + githubToken + '@' + 'api.github.com/repos/' + orgName + '/' + repoName + '/zipball/' + branchName, // https://api.github.com/repos/'+orgName+'/MS-Track-Web-2016/zipball/',
    headers: {
      'User-Agent': 'BIS github-backup'
    }
  }).pipe(fs.createWriteStream('./data/' + repoName + '-' + branchName + '.zip').on('finish', cb))
}

function readBranches (repo, cb) {
  var objRepo = github.getRepo(orgName, repo.name)
  objRepo.listBranches(function (err, branchNames) {
    if (err) {
      console.log(err)
      process.exit(0)
    }
    var result = branchNames.map(function (branchName) {
      return {
        repoName: repo.name,
        branchName: branchName
      }
    })
    cb(null, result)
  })
}
