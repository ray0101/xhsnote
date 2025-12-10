module.exports = {
  apps: [{
    name: 'xhsnote',
    script: 'serve.js',  // 如果需要 Node.js 服务
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};