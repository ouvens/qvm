
(function(root, $){

	/*=====================================================
	 *	静态函数方法初始化
	 *=====================================================*/
	var $DOC = $(document);

	/*=====================================================
	 *	静态函数方法初始化,采用var的函数声明主要是考虑uglify压缩
	 *=====================================================*/
	//辅助开发选项
	var config = {
		isDebug: true
	};

	var noop = noop || function(){};

	var objectEach = function (object, fn, scope  ) {
	    for (var key in object)
	        fn.call( scope, key, object[key] );
	};

	var arrayEach = Array.prototype.forEach ? function (array, fn ,scope) {
	    return array.forEach( fn ,scope )
	} : function (array, fn , scope) {
	    for (var i = 0 , len = array && array.length || 0; i < len; i++)
	        fn.call( scope , array[i], i);
	};

	//扩展String在数组的查找功能
	String.prototype.inArray = Number.prototype.inArray = function(array){
		array = array || [];
		var	value = this.valueOf(),
			flag = false,
			matchReg;
		arrayEach(array, function(string, i){
			matchReg = new RegExp(string, 'g');
			if(string === value){
				flag = true;
			}else if(matchReg.test(value)){
				flag = true;
			}
		});
		return flag;
	};
	//实现String的trim
	String.prototype.trim = function(){
		return this.replace(/(^\s*)|(\s*$)/g, "");
	}

	//返回变量具体类型
	var type = function(object){
		return Object.prototype.toString.call(object).toLowerCase().slice(8, -1);
	};
	
	var log = function() {
	    if (window.console && window.console.log && config.isDebug) {
	        // http://stackoverflow.com/questions/8785624/how-to-safely-wrap-console-log
	        Function.apply.call(console.log, console, arguments)
	    }
	};

	//增加开发者调试
	var error = function(){
		if (window.console && window.console.error && config.isDebug) {
	        Function.apply.call(console.error, console, arguments)
	    }
	}

	//生成vm随机ID串,默认是16位,取后8位随机串即可
	var generateId = function(){
		return '_'+ Math.random().toString().replace(/0./,'').slice(8);
	}

	/*=====================================================
	 *	对象定义方法
	 *=====================================================*/

	var htmlFilter = function(html){
		switch(type(html)){
			case 'object':
				return JSON.stringify(html) || '';
			case 'function':
				return 'function';
			case 'array':
				return JSON.stringify(html) || '';
			default:
				return html || '';
		}
	};

	var getQAttrs = function(elem){
		var qAttrs =[];
		objectEach(elem.attributes, function(key, object){
			var nodeName = object.nodeName;
			if(/q-(.+)/.test(nodeName)){
				qAttrs.push(nodeName.replace('q-',''));
			}
		});
		return qAttrs;
	}

	var getValue = function(elem, key){
		var value = (elem.getAttribute('q-' + key) || '').toString();
		elem.removeAttribute('q-' + key);
		return value;
	};

	 var unDelegate = function(parent, eventType, selector){

	 }

	 $.on = $.on || function(eventType, selector, fn){
	 	eventType = eventType || 'click';

	 }

	/*=====================================================
	 *	对象构造方法
	 *=====================================================*/
	var QNative = QNative || function(){};

	QNative.prototype.define = function(elem, opts){

		var vm = new QNative();
		var directive = [];
		var qAttrs = [];
		var directives = ['text', 'class', 'repeat','on', 'show'];
		var model = {};

		//viewModel变量赋值
		vm.$id = generateId();
		vm.$elem = elem;
		vm.selector = opts.selector;
		vm.parent = opts.parent || elem;

		//获取q-自定义节点,可能存在移动浏览器兼容性问题,待验证
		qAttrs = getQAttrs(vm.$elem);

		vm.data = opts['data'];
		vm.method = opts['method'];

		//viewModel初始化

		var directiveMethod = {
			text:function(key,vm){
				vm.$elem.innerHTML = htmlFilter(Data.parseData(vm.$model[key]['ns'], key, vm));
				return true;
			},
			class: function(key, vm){
				return $(vm.$elem).addClass(Data.parseData(vm.$model[key]['ns'], key, vm));
			},
			//使用q-data-name
			attr: function(key,vm){
				var keyValue = key.split('_'),
					attr = Data.parseData(vm.$model[key]['ns'], key, vm);
				vm.$elem.setAttribute(keyValue[1], attr);
				return true;
			},
			data: function(key,vm){
				var keyValue = key.split('_'),
					attr = Data.parseData(vm.$model[key]['ns'], key, vm);
				$(vm.$elem).data(keyValue[1], attr);
				return true;
			},

			repeat: function(key, vm){
				var list = Data.parseData(vm.$model[key]['ns'], key, vm),
					newNode, nodeTpl;

				nodeTpl = vm.$model[key].tpl;
				vm.$elem.innerHTML = '';
				//此处要移除事件绑定，待考虑

				//如果为对象,则转换为含有该对象长度为1的数组,主要为了兼容性考虑
				if(!list){
					error('repeat cannot apply invalid.' );
					return false;	
				};
				if(type(list) === 'object'){
					list = [list];
				}else if(type(list) === 'array'){
					//正常预期情况
				}else{
					error('array or object is expected, but %s is given.', type(list));
					return false;
				}

				//根据数组对象渲染出模板
				if(type(list) === 'array' && list.length > 0){
					arrayEach(list, function(object, i){
						newNode = nodeTpl.cloneNode(true);

						// 如果可以初始化为
						var subId;
						if(getQAttrs(newNode).length > 0){
							if(newNode.id){
								subId = newNode.id;
							}else{
								subId = generateId();
								newNode.setAttribute('id', subId)
							}
						}
						vm.$elem.appendChild(newNode);

						scan(vm.parent, newNode, object);

					});
				}
				return true;
			},

			//事件代理实现
			on: function(key, vm){
				var eventName = Data.parseData(vm.$model[key]['ns'], key, vm),
					values = eventName.split('|'),
					action = values[0].trim(),
					fn = values[1].trim();
				var $elem = $(vm.parent) || $(vm.$elem);

				if(vm.parent == vm.$elem){
					$elem.off(action).on(action, function(){
						vm.method[fn].call(this,vm.$elem);
					});
				}else{

					$elem.off(action).on(action, vm.selector, function(){
						vm.method[fn].call(this,vm.$elem);
					});
				}
				return true;
			},


		};

		//Data 数据解析
		Data = {

			parseData: function(ns, key, vm){
				var nsArray = ns.split('.'),
				    data = vm.data,
				    returnValue = data;

				if(type(nsArray) === 'array'){
					arrayEach(nsArray, function(ns, i){
						switch(key){
							case 'on':
								returnValue = ns;
								break;
							default:
								returnValue = returnValue[ns];
								break;
						}
					});
				}else if(type(ns) === 'string'){
					// switch(key){
					// 	case 'on':
					// 		returnValue = ns;
					// 	default:
					// 		returnValue = returnValue[ns];
					// 		break;
					// }
				}else{

				}
				return returnValue;
			},

			setData: function(ns, key, value, vm){
				var nsArray = (ns || '').split('.'),
				    data = vm.data;
				switch(key){
					case 'text':
						arrayEach(nsArray, function(key, i){
							if(type(data[key]) === 'object'){
								data = data[key];
							}else if(type(data[key]) === 'string' || type(data[key]) == 'array'){
								data [key] = value;
								return true
							}	
						});
						break;
					case 'class':
						arrayEach(nsArray, function(key, i){
								if(type(data[key]) === 'object'){
									data = data[key];
								}else if(type(data[key]) === 'string' || type(data[key]) == 'array'){
									//移除原有class
									$(vm.$elem).removeClass(data[key]);
									data[key] = value;
									return true
								}	
							});
						break;
					case 'on':
						// on指令比较特殊，需要修改ns
						vm.$model[key].ns = value;
						vm.$model[key].value = value;
						break;
					default:
						arrayEach(nsArray, function(key, i){
							if(type(data[key]) === 'object'){
								data = data[key];
							}else if(type(data[key]) === 'string' || type(data[key]) == 'array'){
								data [key] = value;
								return true
							}	
						});
						break;
				}
			}
		}
		//扫描到所有q属性,然后根据属性更新$model
		arrayEach(qAttrs, function(attr, i){
			var qNs = getValue(vm.$elem, attr),
				qData = Data.parseData(qNs ,attr, vm);

				//data方法待完善
			var newDirective = [];

			//如果自定义属性添加到对应的事件列表中
			if(opts[qNs] && type(opts[qNs]) === 'function'){
				//自定义directives
				newDirective.push(opts[qNs]);
			}else if(attr.inArray(directives)){
				//框架默认directives
				newDirective.push(directiveMethod[attr]);
			}else{
				//处理data和attr指令			

				var directive,
					isAttr = (new RegExp('attr-')).test(attr),
					isData = (new RegExp('data-')).test(attr);

				if(isAttr || isData){
					attr = attr.replace('-', '_');
					if(isAttr){
						newDirective.push(directiveMethod['attr']);
					}else if(isData){
						newDirective.push(directiveMethod['data']);
					}
				}
				// newDirective = [directive];
			}
			model[attr] = {
				key: attr,
				value: qData,
				ns: qNs,
				directive: newDirective
			};

			//不同directive的特殊属性处理，例如repeat会要求保存子节点的模板
			switch(attr){
				// 进行节点模板的操作
				case 'repeat':
					var fragment = document.createDocumentFragment(),
						newElem = document.createElement('div');
					if(vm.$elem.children.length > 1){
						objectEach(vm.$elem.children, function(key, object){
							// 如果是html节点则加入渲染模板
							if(type(object).indexOf('html') >= 0){
								fragment.appendChild(object.cloneNode(true));
							}
						});
						newElem.appendChild(fragment);
					}else{
						newElem = vm.$elem.children[0].cloneNode(true);
					}
					model[attr].tpl = newElem;
					break;
				default:
					break;
			}
		});

		vm.$model = model;

		//触发directive
		objectEach(model, function(key, object){
			var viewModel = model[key];
			var value = viewModel.value;//getAttribute('q-'+key);
			arrayEach(viewModel.directive, function(fn){
				fn.call(this, key, vm);
			});
		});
		// debugger

		/*=====================================================
		 *	对象viewModel watch and unwatch
		 *=====================================================*/

		var vmEvents = {
			// vm : vm
			getter: function(){
				var me= this,
					value;
				// console.log('Getter invoked~: ' + me.key);

				value = getValue(vm.$elem, me.key);
				return value;
			},

			setter: function(value){
				//如何获取改变的对象的游标
				var me= this,
					setterKey = this.key,
					vmModel = vm.$model;
				// console.log('Setter invoked~:{'+ setterKey + ':' + value +'}');

				objectEach(vmModel, function(key, object){
					if(key !== setterKey) return;
					Data.setData(object.ns, key, value, vm);
					arrayEach(object.directive, function(fn){
						fn.call(this, key, vm);
					});
				});
			},

			//watch vmModel and value
			$watch: function(vmModel, value){

				objectEach(vmModel,function(key, object){
					vmEvents.defineGetAndSet(object, key, 'accessor');
				});
			},
			$unwatch: function(){

			},

			//define getter and setter
			defineGetAndSet: function(obj, propName, accessor,  getter, setter) {
				// console.log("define Get and Setter apply");
				try {
					Object.defineProperty(obj, accessor, {
						//https://msdn.microsoft.com/zh-cn/library/dd548687
						get: function(){
							return this[propName];
						},
						set: function(value){
							//如何获取改变的对象的游标
							var me= this,
								setterKey = this.key,
								vmModel = vm.$model;

							obj[propName] = value;
							// console.log('Setter invoked~:{'+ setterKey + ':' + value +'}');

							objectEach(vmModel, function(key, object){
								if(key !== setterKey) return;
								Data.setData(object.ns, key, value, vm);
								arrayEach(object.directive, function(fn){
									fn.call(this, setterKey, vm);
								});
							});
						},

						enumerable: true,
						configurable: true
					});
				} catch(error) {
					try{
						Object.prototype.__defineGetter__.call(obj, propName, getter);
						Object.prototype.__defineSetter__.call(obj, propName, setter);
					}catch(error2){
						console.log("browser not supported.");
					}
				}
			}
		};
		//添加watch
		vmEvents.$watch(vm.$model);

		//实现嵌套，如果不是repeat且有子元素的情况下使用嵌套，但是父元素不要用q-text
		if(vm.$elem.children.length > 0 && !vm.$model.repeat){
			scan(vm, vm.$elem, vm.data);
		}
		// console.log(vm)
		//扫描节点，需要改进
		function scan(vm, elem, data){
			var children = $(elem).find('*');
			arrayEach(children, function(elemNode, i){

				var subId;
				//将外部opts的参数带入子元素中使用，但是元素节点使用子节点
				//有Q属性时生成自动id并初始化一次
				if(getQAttrs(elemNode).length > 0){
					if(elemNode.id){
						subId = elemNode.id;
					}else{
						subId = generateId();
						elemNode.setAttribute('id', subId)
					}
					var subOpts = $.extend(opts,{
							selector: '#' + subId,
							data: data,
							parent: vm.parent,
							method: vm.method
						},true);
					qvm.get(subOpts);
				}
				// 扫描下一个子节点保证遍历所有的节点
				scan(parent, elemNode.children[i], data);
				
			});
		}

		//生成返回vm对象
		return vm.$model;
	}

	var methods ={

		//get方法选择遵循jQuery选择器规则
		get: function(opts){
			var doc = {selector: 'body'};

			if(type(opts) !== 'object' || !opts.selector){
				return this.get(doc);
			}

			var elem = type(opts.selector) === 'htmldivelement'?
				opts.selector: $DOC.find(opts.selector)[0];

		    if (elem) {
		        return this.define(elem, opts);
		    } else {
		        return this.get(doc);
		    }
		}
	};

	$.extend(QNative.prototype, methods);

	/*=====================================================
	 *	对象实例返回
	 *=====================================================*/
	var Qvm = new QNative();
	root.qvm = root.Qvm = Qvm;

})(window, window.Zepto || window.jQuery);