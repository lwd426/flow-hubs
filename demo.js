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
