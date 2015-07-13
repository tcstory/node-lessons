/// <reference path="../typings/express/express.d.ts"/>
/// <reference path="../typings/node/node.d.ts"/>
"use strict";

var express = require('express');
var superAgent = require('superagent');
var cheerio = require('cheerio');

var app = express();

app.get('/', function (req, res) {
    var url = 'https://cnodejs.org';
    var items:Array<{href:string;title:string;}>=[];
    superAgent
        .get(url)
        .set({
            Referer: url,
            'User-Agent': "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0"
        })
        .end(function (err, response) {
            if (err) {
                console.log(err.status);
                return false;
            }
            // 如果真的出错了,那么response将会是undefined,这时候访问status属性会出错,所以还是
            // 得有上面代码的错误检查
            if (response.status === 200) {
                var $ = cheerio.load(response.text);
            }
            $('#topic_list .cell').each(function (index, item) {
                var $item = $(item);
                // 每一篇文章的url
                var itemURL = url + $item.find('.topic_title').attr('href');
                var author = $item.find('.user_avatar > img').attr('title');
                var title = $item.find('.topic_title').attr('title');
                items.push({
                    title: title,
                    href: itemURL,
                    author: author
                })
            });
            if (items) {
                res.send(items);
            }
        });
});
app.listen(3000);



