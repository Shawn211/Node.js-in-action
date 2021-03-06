var qs = require('querystring');

// 发送HTML响应
exports.sendHtml = function(res, html){
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Lenght', Buffer.byteLength(html));
    res.end(html);
};

// 解析HTTP POST数据
exports.parseReceivedData = function(req, cb){
    var body = '';
    req.setEncoding('utf-8');
    req.on('data', function(chunk){body += chunk;});
    req.on('end', function(){
        var data = qs.parse(body);
        cb(data);
    });
};

// 渲染简单的表单
exports.actionForm = function(id, path, label){
    var html = `
    <form method="POST" action="` + path + `">
        <input type="hidden" name="id" value="` + id + `"></input>
        <input type="submit" value="` + label + `"></input>
    </form>`;
    return html;
};

exports.add = function(db, req, res){
    exports.parseReceivedData(req, function(work){
        db.query(`
            INSERT INTO work (hours, date, description) VALUES (?, ?, ?)
            `,
            [work.hours, work.date, work.description],
            function(err){
                if(err) throw err;
                exports.show(db, res);
            }
        );
    });
};

exports.delete = function(db, req, res){
    exports.parseReceivedData(req, function(work){
        db.query(`
            DELETE FROM work WHERE id=?
            `,
            [work.id],
            function(err){
                if(err) throw err;
                exports.show(db, res, true);
            }
        );
    });
};

exports.archive = function(db, req, res){
    exports.parseReceivedData(req, function(work){
        db.query(`
            UPDATE work SET archived=1 WHERE id=?`,
            [work.id],
            function(err){
                if(err) throw err;
                exports.show(db, res);
            }
        );
    });
};

exports.show = function(db, res, showArchived){
    var query = `SELECT * FROM work WHERE archived=? ORDER BY date DESC`;
    var archiveValue = showArchived ? 1 : 0;
    db.query(
        query,
        archiveValue,  // 想要的工作记录归档状态
        function(err, rows){
            if(err) throw err;
            var html = '<meta charset="utf-8">' + (archiveValue ? '<a href="/">Unarchived Work</a>' : '<a href="/archived">Archived Work</a>');
            html += exports.workHitlistHtml(rows);  // 将结果格式化为HTML表格
            html += exports.workFormHtml();
            exports.sendHtml(res, html);
        }
    );
};

exports.showArchived = function(db, res){
    exports.show(db, res, true);
};

exports.workHitlistHtml = function(rows){
    var html = '<table><tr><td><h2>Date</h2></td><td><h2>Hours</h2></td><td><h2>Description</h2></td></tr>';
    for(var i in rows){
        html += '<tr>';
        html += '<td>' + rows[i].date + '</td>';
        html += '<td>' + rows[i].hours + '</td>';
        html += '<td>' + rows[i].description + '</td>';
        if(!rows[i].archived){
            html += '<td>' + exports.workArchiveForm(rows[i].id) + '</td>';  // 如果工作记录还没归档，显示归档按钮
        }
        html += '<td>' + exports.workDeleteForm(rows[i].id) + '</td>';
        html += '</tr>';
    }
    html += '</table>';
    return html;
};

// 记录输入表单
exports.workFormHtml = function(){
    var html = `
        <form method="POST" action="/">
            <p>Date (YYYY-MM-DD):</br><input name="date" type="text"></p>
            <p>Hours worked:</br><input name="hours" type="text"></p>
            <p>Description:</br><textarea name="description"></textarea></p>
            <input type="submit" value="add" />
        </form>
    `
    return html;
};

exports.workArchiveForm = function(id){
    return exports.actionForm(id, '/archive', 'Archive');
};

exports.workDeleteForm = function(id){
    return exports.actionForm(id, '/delete', 'Delete');
};