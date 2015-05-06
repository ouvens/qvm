(function (root, factory) {
	if (typeof define === 'function' && typeof require === 'function') {
		define(['./qmv'], factory);
	} else if (typeof module === 'object' && typeof module.exports === 'object') {
		factory();
	}else{
		root['qmv'] = factory();
	}
})(this, function (Qmv) {
	window.Qmv = Qmv;

	p = Qmv.get("#div");
	p.set('string',{'value':"string","class":"class7","name":"stephen",'obj':{"value1": "哈哈"}});

	q = Qmv.get("#div2");
	q.set('string',{'value':"string","class":"class7","name":"stephen",'obj':{"value1": "哈哈"}});

	input = Qmv.get("#input");
	input.set('string','8');
	console.log(p)
});
