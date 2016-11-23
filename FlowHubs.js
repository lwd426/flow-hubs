var utils = require('../utils/index.js');
var isArray = utils.isArray;
var performTasks = utils.performTasks;
var isGeneratorFunction = utils.isGeneratorFunction;
var isPromise = utils.isPromise;
var deepCopy = utils.deepCopy;
var isThunkFunction = utils.isThunkFunction;
var co = require('co');

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
	if (!this.services.hasOwnProperty(serviceName)) {
		this.services[serviceName] = {
			params: {},
			operations: [],
			callback_error: function*() {
			},
			callback_success: function*() {
			},
			status: undefined
		};
	}

	var service = this.services[serviceName];
	operations.map(function (operation, k) {
		var cell = operation[0];
		var inputs = operation[1];
		var output = operation[2];
		//压入操作流程
		if (!!cell) {
			return service.operations.push({
				'operation': cell,
				'inputs': inputs,
				'output': output
			});
		}
		//声明变量
		if (!!inputs && isArray(inputs)) {
			inputs.map(function (cell, i) {
				service.params[cell] = undefined;
			});
		} else if (!!inputs && Object.prototype.toString.call(inputs) === '[object Object]') {
			for (var key in inputs) {
				service.params[key] = inputs[key];
			}
		}
		//声明变量
		if (!!output) service.params[output] = undefined;
	});
	//深拷贝当前服务数组，以便结束触发时重置service
	service.init = deepCopy(service);
	service.callback_success = callback_success || function*() {
		};
	service.callback_error = callback_error || function*() {
		};
}

FlowHubs.prototype.emit = function (serviceName, option) {
	var _this = this;
	var service = _this.services[serviceName];
	return new Promise(function (resolve, reject) {
		if (!_this.services.hasOwnProperty(serviceName)) throw new Error('服务' + serviceName + '不存在');
		var operations = service.operations || [];
		//声明并初始化参数
		for (var key in option) {
			service.params[key] = option[key];
		}
		var operationsWithParams = operations.map(function (operation, k) {
			return function*() {
				try {

					var inputsArray = [];
					var inputs = operation.inputs;
					var output = operation.output;
					var opera = operation.operation;
					if (!!inputs && isArray(inputs)) {
						inputs.map(function (cell, i) {
							inputsArray.push(service.params[cell]);
						});
					} else if (!!inputs && Object.prototype.toString.call(inputs) === '[object Object]') {
						for (var key in inputs) {
							inputsArray.push(service.params[key]);
						}
					}
					inputsArray = inputsArray || [];
					var result = '';
					// if (isGeneratorFunction(opera) || isPromise(opera) || isThunkFunction(opera)) {
					try {
						result = yield opera.apply(null, inputsArray);
					} catch (e) {
						if (e instanceof TypeError) {
							result = opera.apply(null, inputsArray);
						} else {
							throw e;
						}
					}

					!!output ? service.params[output] = result : '';
				} catch (err) {
					throw err;
				}
			}

		});
		co(function*() {
			yield performTasks(operationsWithParams);
			yield service.callback_success.call(null, service.params);
			resolve('success');
		}).catch(function (err) {
			co(function*() {
				yield service.callback_error.call(null, err, service.params);

				reject(err);
			});
		});
	});
}

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
