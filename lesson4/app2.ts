/// <reference path="typings/node/node.d.ts"/>
/// <reference path="typings/express/express.d.ts"/>
"use strict";

// loading modules
var superAgent = require('superagent');
var cheerio = require('cheerio');
var async = require('async');
var urlModule = require('url');

// global variables
var cnodeUrl = "https://cnodejs.org/";
var myResults;

async.auto({
    'task1': getPostUrls,
    'task2': ['task1', getData],
    'task3': ['task2', getUserScore],
    'task4': ['task3', function (callback, result) {
        console.log(myResults);
        callback();
    }]
}, function (err, result) {
    if(err) {
        console.log(err);
    }
});

/**
 * get the urls of the posts in the homepage
 * @param callback
 * @param result
 * @returns {boolean}
 */
function getPostUrls(callback, result) {
    superAgent
        .get(cnodeUrl)
        .set({
            'User-Agent': "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0"
        })
        .end(function (err, res) {
            if (err) {
                console.log('task1:' + err.status);
                callback(err.status);
            }
            if (res.status === 200) {
                var $ = cheerio.load(res.text);
                var post_url_list:Array<string> = [];
                $('#topic_list .topic_title').each(function (index, item) {
                    var $item = $(item);
                    var post_url = urlModule.resolve(cnodeUrl, $item.attr('href'));
                    post_url_list.push(post_url);
                });
                callback(null, post_url_list);
            }
        });
    return true;
}


/**
 * get the url, title and first comment of the post
 * @param callback
 * @param result
 * @returns {boolean}
 */
function getData(callback, result) {
    var post_url_list = result['task1'];
    var user_info_list:Array<string> = [];
    async.mapLimit(post_url_list, 10, function (item, callback) {
        superAgent
            .get(item)
            .set({
                'User-Agent': "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0",
                'Referer': cnodeUrl
            })
            .end(function (err, res) {
                if (err) {
                    // do not execute callback(err.status) when an error occurred
                    // because we need to get the info from the another post url
                    console.log('getData: ' + err.status);
                }
                if (res.status === 200) {
                    var $ = cheerio.load(res.text);
                    var _title = $('.topic_full_title').text();
                    var reply_content = $('#reply1 > .reply_content p').text();
                    var user_info_url = $('#reply1  .user_avatar').attr('href');
                    // the post was not replied by nay user which has no comment,
                    // so the user_info_url is undefined
                    if (user_info_url) {
                        user_info_url = urlModule.resolve(cnodeUrl, user_info_url);
                    } else {
                        user_info_url = '';
                    }
                    user_info_list.push(user_info_url);
                    callback(null, {
                        title: _title,
                        href: item,
                        comment1: reply_content
                    });
                }

            })
    }, function (err, results) {
        if (err) {
            console.log('getData: ' + err);
            callback(err);
        } else {
            myResults = results;
            callback(null, user_info_list);
        }
    });
    return true;
}

/**
 * get the score of individual user
 * @param callback
 * @param result
 * @returns {boolean}
 */
function getUserScore(callback, result) {
    var user_info_list = result['task2'];
    async.mapLimit(user_info_list, 10, function (item, callback) {
        // maybe the value of item is ''
        if (!item) {
            callback(null, '');
            return false;
        }
        superAgent
            .get(item)
            .set({
                'User-Agent': "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0",
            })
            .end(function (err, res) {
                if (err) {
                    // do not execute callback(err.status) when an error occurred
                    // because we need to get the info from the another post url
                    console.log('getData: ' + err.status);
                }
                if (res.status === 200) {
                    var $ = cheerio.load(res.text);
                    var score = $('.user_card span.big').text();
                    callback(null, score);
                }

            });
    }, function (err, results) {
        if (err) {
            console.log('getData: ' + err);
            callback(err);
        } else {
            results.forEach(function (item, index, array) {
                myResults[index]['score'] = item;
            });
            callback();
        }

    });
    return true;
}
