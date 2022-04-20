let plugins = [
    '-lunr', // 默认插件，无需引用
    '-sharing', // 默认插件，无需引用
    '-search', // 默认插件，无需引用
    '-favicon', // 默认插件，无需引用
    'code',
    'expandable-chapters',
    'theme-lou',
    'back-to-top-button',
    'search-pro',
    'flexible-alerts',
  ];
  if (process.env.NODE_ENV == 'dev') plugins.push('livereload');
  
  module.exports = {
    title: '技术文档沉淀',
    author: '方洋',
    lang: 'zh-cn',
    description: '博客技术文档总结',
    plugins,
    pluginsConfig: {
      // gitbook-plugin-code 插件配置
      code: {
        copyButtons: true, // code插件复制按钮
      },
      // gitbook-plugin-theme-lou 主题插件配置
      'theme-lou': {
        color: '#2096FF', // 主题色
        favicon: 'assets/favicon.ico', // 网站图标
        logo: 'assets/logo.png', // Logo图
        copyrightLogo: 'assets/copyright.png', // 背景水印版权图
        autoNumber: 3, // 自动给标题添加编号(如1.1.1)
        titleColor: {
          // 自定义标题颜色(不设置则默认使用主题色)
          h1: '#8b008b', // 一级标题颜色
          h2: '#20b2aa', // 二级标题颜色
          h3: '#a52a2a', // 三级标题颜色
        },
        forbidCopy: true, // 页面是否禁止复制（不影响code插件的复制）
        'search-placeholder': '众里寻他千百度', // 搜索框默认文本
        'hide-elements': ['.summary .gitbook-link'], // 需要隐藏的标签
        copyright: {
          author: '松露老师', // 底部版权展示的作者名
        },
      },
    },
  };
  