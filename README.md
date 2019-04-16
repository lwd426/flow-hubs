# flow-hubs
一个流程的集线器，从而可以清晰的书写流程的调用。其中，过程函数可以使普通函数、promise对象或者generator函数等，具体可以看readme文档。

# 基于流程的编程 - 流程集线器

## 一、什么是集线器？

百度百科的定义是：**集线器的英文称为“Hub”**。“Hub”是“中心”的意思，集线器的主要功能是对接收到的信号进行再生整形放大，以扩大网络的传输距离，同时把所有节点集中在以它为中心的节点上。

## 二、集线器在代码上的思考

可是，这TM跟我个程序员有毛线的关系？￣□￣｜｜

额，好像是没什么关系，不过，你是不是在经历了以下场景有，发际线慢慢的后移了≡(▔﹏▔)≡

> 1. 业务流程冗长，而又相互依赖，promiseAll都觉得代码一大坨，看着都闹心
> 2. 貌似无限而又纷乱的回调地狱，导致代码控制权被不断转交。（PS：环境变量招谁惹谁了……）
> 3. 写服务端流程，各种管道和中间件被套来套去，调试个代码，没半个小时根本就甭想看清楚变量的值
> 4. 还有……就不多说了，反正发际线后移了≡(▔﹏▔)≡

所以，请大家把注意力集中到Hub定义的***"把所有节点集中在以它为中心的节点上"***这一句，这个东西应该能帮我们做点什么。所以，我2016年业余时间做了个小工具，帮助我们完成一个复杂流程的注册和自动调用的工作，我感觉它就像是耳机绕线器，能把耳机理顺，所以给它起名为FlowHub。

## 三、FlowHub的应用场景
它的应用场景基本符合以上3个：
1. 后端一个流程类服务的编写
2. 前端一个有数据依赖或步骤依赖的方法编写
3. 缓和回调地狱的问题

## 四、设计思路

设计很简单，一张图大家自行可以看懂

![markdown](/flowhub1.png)

## 五、使用demo
```javascript
var FlowHubs = require('./FlowHubs.js');
var versionOperation = require('../services/index.js'); //lwd：版本控制的核心工具文件
var mongo = require("../db/mongo"); //lwd: 操作mongodb的工具文件
var loggerUtil = require('../utils/logger');
var validUser = require('../intercepter/ldap.js');


module.exports = function registerServices() {
	try { 
		//一个流程的定义
		FlowHubs.register('UpdateVersion', [
			[versionOperation.resetTempforlders, ['appFolder'], 'editing'],
			[versionOperation.pullCodes, ['gitOption', 'appFolder'], 'configJson'],
			[versionOperation.judgeBugfix, ['gitOption', 'defaultBranchName' ,'configJson'], undefined],
			[versionOperation.generateVersionNum, ['configJson', 'appCode', 'cunrrentVersionNum','gitOption','branchName'], 'newVersionNum'],
			[versionOperation.generateVersionName, ['newVersionNum', 'configJson'], 'versionName'],
			[versionOperation.generateZipName, ['newVersionNum', 'appCode'], 'uuidName'],
			[versionOperation.zipFiles, ['newVersionPath', 'uuidName', 'appFolder'], 'zipAddr'],
			[versionOperation.uploadZipToCdn, ['cdnUrl', 'zipAddr', 'uuidName', 'appFolder', 'cdnRetry'], 'newVersionCdnAddr'],
			[mongo.getBeforeVersions, ['appCode', 'newVersionNum', 'appFolder', 'configJson'], 'lastPackagesInfo'],
			[versionOperation.saveAppVersionToMongo, ['appCode', 'configJson'], 'version'],
			[mongo.saveToMongodb, ['zipAddr', 'newVersionCdnAddr', 'newVersionNum', 'appCode', 'userName', 'configJson', 'appFolder', 'versionAppVersion'], 'versionCode'],
			[versionOperation.request2Cdn, ['appCode', 'newVersionNum', 'cdnRetry'], undefined],
			[versionOperation.multiWorkers, ['lastPackagesInfo', 'newVersionPath', 'newVersionNum', 'appCode', 'versionCode', 'cdnUrl','appFolder'], 'result'],
			[loggerUtil.setStatus, undefined, undefined]
		], function*(params) {
			yield versionOperation.unlock(params.appFolder);
		}, function*(error, params) {
			yield versionOperation.unlock(params.appFolder);
		});
	} catch (err) {
		throw err;
	}
}
```

## 六、实现框架

实现很简单轻量，接口描述如下：
```javascript
function FlowHubs() {
	this.services = [];
}

/**
 * 注册一个服务
 *
 * @param  {[type]} serviceName [服务名]
 * @param  {[type]} operations        [步骤] （operation结构：[方法体，入参，返回值]）
 * @return {[type]}             [此服务的步骤]
 */
FlowHubs.prototype.register = function (serviceName, operations, callback_success, callback_error) {
	// TODO
}

/**
 * 调用一个服务
 *
 * @param  {[type]} serviceName [服务名]
 * @param  {[type]} option [服务的必要配置项]
**/
FlowHubs.prototype.emit = function (serviceName, option) {

}

// 以下为实例内部方法
FlowHubs.prototype.get = function (serviceName, paramName) {
	var service = this.services[serviceName];
	return service.params[paramName];
}

FlowHubs.prototype.stop = function (serviceName) {
	var service = this.services[serviceName];
	service.operations = [];
	service.status = 'stop';
}

FlowHubs.prototype.clear = function (serviceName) {
	var service = this.services[serviceName];
	service = service.init;
	service.init = null;
}

module.exports = new FlowHubs();

```

