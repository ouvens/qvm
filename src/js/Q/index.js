(function (root, factory) {
	if (typeof define === 'function' && typeof require === 'function') {
		define(['./Q.js'], factory);
	}else{
		root['Q'] = factory();
	}
})(this, function (Q) {

	var vm = Q.all({
	    el: '#div',
	    data: {
	        msg: 'hello'
	    },
	    methods:{
	    	ready:function (argument) {
	    		alert();
	    	}
	    }
	});
	// console.log(vm)

	vm.$set("msg","改变的值")

});