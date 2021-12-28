 
jQuery(document).ready(function( $ ) {
	updateZplane();
});
 

function updateValue(which) {
	var val = document.getElementById(which).value;

	var paired;
	
	if (paired)
		val /= 200;
	else
		val = val / 100 - 1;

	document.getElementById(which + "_field").value = val;
}

 

function updateZplane() {
	var p1 = document.getElementById("pole1_polezero2").value / 200;
	var p2 = document.getElementById("pole2_polezero2").value / 200;
	var z1 = document.getElementById("zero1_polezero2").value / 200;
	var z2 = document.getElementById("zero2_polezero2").value / 200;
	
	var poles = [];
	var zeros = [];
	var polesPaired = document.getElementById("polePair_polezero2").checked;
	var zerosPaired = document.getElementById("zeroPair_polezero2").checked;

	var x1, y1;
	if (polesPaired) {
		// complex conjugate poles and zeros
		x1 = Math.cos(p2 * Math.PI) * p1;
		if (Math.abs(x1) < 1E-14)
			x1 = 0;
		y1 = Math.sin(p2 * Math.PI) * p1;
		if (Math.abs(y1) < 1E-14)
			y1 = 0;
		poles.push([x1, y1]);
		poles.push([x1, -y1]);
	}
	else {
		poles.push([p1 * 2 - 1, 0]);
		poles.push([p2 * 2 - 1, 0]);
	}
	
	if (zerosPaired) {
		x1 = Math.cos(z2 * Math.PI) * z1;
		if (Math.abs(x1) < 1E-14)
			x1 = 0;
		y1 = Math.sin(z2 * Math.PI) * z1;
		if (Math.abs(y1) < 1E-14)
			y1 = 0;
		zeros.push([x1, y1]);
		zeros.push([x1, -y1]);
	}
	else {
		zeros.push([z1 * 2 - 1, 0]);
		zeros.push([z2 * 2 - 1, 0]);
	}

	setZplane(poles, zeros);
}

function setZplane(poles, zeros) {

	var radius = 100;	// radius of unit circle
	var pSize = 4;		// size of pole and zero graphic
	var zSize = 4;

	var c=document.getElementById("zplane_polezero2");
	var ctx=c.getContext("2d");
	
	ctx.clearRect(0, 0, c.width, c.height);

	var pad = (c.width - 2 * radius) / 2; // padding on each side
	
	// unit circle
	ctx.beginPath();
	ctx.strokeStyle="red";
	ctx.arc(radius+pad,radius+pad,radius,0,2*Math.PI);
	ctx.stroke();

	// y axis
	ctx.beginPath(); 
	//ctx.lineWidth="1";
	ctx.strokeStyle="lightgray";
	ctx.moveTo(radius+pad,0);
	ctx.lineTo(radius+pad,c.height);
	ctx.font = "italic 8px sans-serif";
	ctx.fillText("Im", radius+pad+2, pad-2);

	// x axis
	ctx.moveTo(0,radius+pad);
	ctx.lineTo(c.width,radius+pad);
	ctx.fillText("Re", radius+radius+pad+2, radius+pad-2);
	ctx.stroke(); // Draw it

	// poles
	ctx.strokeStyle="blue";
	var idx;
	for (idx = 0; idx < poles.length; idx++) {
		var x = radius + Math.round(radius * poles[idx][0]);
		var y = radius - Math.round(radius * poles[idx][1]);
		ctx.beginPath();
		ctx.moveTo(x - pSize + pad, y - pSize + pad);
		ctx.lineTo(x + pSize + pad, y + pSize + pad);
		ctx.moveTo(x - pSize + pad, y + pSize + pad);
		ctx.lineTo(x + pSize + pad, y - pSize + pad);
		ctx.stroke();
	}
	
	// zeros
	for (idx = 0; idx < zeros.length; idx++) {
		var x = radius + Math.round(radius * zeros[idx][0]);
		var y = radius - Math.round(radius * zeros[idx][1]);
		ctx.beginPath();
		ctx.arc(x + pad, y + pad, zSize, 0, 2*Math.PI);
		ctx.stroke();
	}

	// calc max and min, because we may not end up sampling at that exact spot later (an issue at high Q, especially log plot)
	var polePt = [poles[0][0], poles[0][1]];
	if (Math.abs(poles[0][0]) < Math.abs(poles[1][0]))
		polePt[0] = poles[1][0];
	var poleRadius = Math.sqrt(Math.pow(polePt[0], 2) + Math.pow(polePt[1], 2));
	var poleAngle = Math.atan2(polePt[1], polePt[0]);

	var zeroPt = [zeros[0][0], zeros[0][1]];
	if (Math.abs(zeros[0][0]) < Math.abs(zeros[1][0]))
		zeroPt[0] = zeros[1][0];
	var zeroRadius = Math.sqrt(Math.pow(zeroPt[0], 2) + Math.pow(zeroPt[1], 2));
	var zeroAngle = Math.atan2(zeroPt[1], zeroPt[0]);

	// plot response
	// on the unit circle, the ratio of products of distances from zeros to the products of distances from poles
	var FsField = document.getElementById("Fs_polezero2");
	var Fs = parseFloat(FsField.value);
	
	var angle;
	var mag = [];
	
	// find max gain: at the pole angle, or 0 or pi
	var maxAngle = poleAngle;
	var magMax = magResponse_polezero2(poleAngle, poles, zeros);
	var magAt0 = magResponse_polezero2(0, poles, zeros);
	if (magMax < magAt0) {
		maxAngle = 0;
		magMax = magAt0;
	}
	var magAtPI = magResponse_polezero2(Math.PI, poles, zeros);
	if (magMax < magAtPI) {
		maxAngle = Math.PI;
		magMax = magAtPI;
	}
	
	var magNorm = magMax;

	// gain at min
	var minAngle = zeroAngle;
	var magMin = magResponse_polezero2(zeroAngle, poles, zeros);
	if (magMin > magAt0) {
		minAngle = Math.PI;
		magMin = magAt0;
	}
	if (magMin > magAtPI) {
		minAngle = 0;
		magMin = magAtPI;
	}

	var maxInserted = false, minInserted = false;
	var maxPoint = 600;
	for (idx = 0; idx <= maxPoint; idx++) {
		// step through from 0-pi
		 
			angle = Math.exp(Math.log(1 / 0.001) * idx / maxPoint) * 0.001 * Math.PI;	// 0.001 to 1, times pi, log scale

		// if we've just passed the angle of max (poleAngle) or min (zeroAngle)
		// insert that angle before inserting the current angle
		// note: this is important, because as the user sweeps the control, max could fall between graph points and make the response appear to jitter
		if (!maxInserted) {
			 
				maxInserted = true;
				mag.push([idx / maxPoint / 2, magMax])
			
		}
		if (!minInserted) {
			 
				minInserted = true;
				mag.push([idx / maxPoint / 2, magMin])
			
		}

		var val = magResponse_polezero2(angle, poles, zeros);
		mag.push([idx / maxPoint / 2, val])

		// track max
		if (val > magNorm)
			magNorm = val;
	}
	
	// normalize
	for (idx = 0; idx < mag.length; idx++)
		mag[idx][1] -= magNorm;
	
	// plot
	var container = document.getElementById('magnitude_polezero2');
	var container2 = document.getElementById('magnitude_polezero22');
	 
		graph = Flotr.draw(container, [ mag ], { yaxis: { max : 0, min : -120 }, xaxis: { tickFormatter: nullTickFormatter_polezero2 } });
		graph2 = Flotr.draw(container2, [ mag ], { yaxis: { max : 0, min : -120 }, xaxis: { tickFormatter: nullTickFormatter_polezero2 } });

	// show coefficients
	var coefsList = "poles at " + poles[0][0];
	var temp = poles[0][1];
	if (temp != 0)
		coefsList += " \xB1 " + Math.abs(temp) + "i\n";
	else
		coefsList += ", " + poles[1][0] + "\n";

	coefsList += "zeros at " + zeros[0][0];
	var temp = zeros[0][1];
	if (temp != 0)
		coefsList += " \xB1 " + Math.abs(temp) + "i\n";
	else
		coefsList += ", " + zeros[1][0] + "\n";
	
	var coefs = getBiquadCoefs_polezero2(poles, zeros, magMax);
	coefsList += "\na0 = " + coefs[0] + "\n";	
	coefsList += "a1 = " + coefs[1] + "\n";
	coefsList += "a2 = " + coefs[2] + "\n";
	coefsList += "b1 = " + coefs[4] + "\n";
    coefsList += "b2 = " + coefs[5];
    document.getElementById("coefsList_polezero2").value = coefsList;
    

}
 

function getBiquadCoefs_polezero2(poles, zeros, gainMax) {
	var out = [6];
	out[0] = 1.0;
	if (zeros[0][1] == 0) {
		out[1] = -(zeros[0][0] + zeros[1][0]);
		out[2] = zeros[0][0] * zeros[1][0] + zeros[0][1] * zeros[1][1];
	}
	else {
		var r = Math.sqrt(zeros[0][0] * zeros[0][0] + zeros[0][1] * zeros[0][1]);
		var cosTheta = Math.sign(zeros[0][0]) * 1 / Math.sqrt((zeros[0][1] * zeros[0][1]) / (zeros[0][0] * zeros[0][0]) + 1);
		out[1] = -2 * r * cosTheta;
		out[2] = r * r;
	}

	out[3] = 1.0;
	if (poles[0][1] == 0) {
		out[4] = -(poles[0][0] + poles[1][0]);
		out[5] = poles[0][0] * poles[1][0] + poles[0][1] * poles[1][1];
	}
	else {
		var r = Math.sqrt(poles[0][0] * poles[0][0] + poles[0][1] * poles[0][1]);
		var cosTheta = Math.sign(poles[0][0]) * 1 / Math.sqrt((poles[0][1] * poles[0][1]) / (poles[0][0] * poles[0][0]) + 1);
		out[4] = -2 * r * cosTheta;
		out[5] = r * r;
	}

	var norm = Math.pow(10, -gainMax / 20.0);
	out[0] *= norm;
	out[1] *= norm;
	out[2] *= norm;
	return out;
}
function nullTickFormatter_polezero2(xval) {
	var FsField = document.getElementById("Fs_polezero2");
	var Fs = parseFloat(FsField.value);
	var val = Math.exp(Math.log(1 / 0.001) * xval * 2) * 0.001 * Fs * 0.5;
	if (val < 1)
		return val.toFixed(3);
	if (val < 10)
		return val.toFixed(2);
	return val.toFixed(1);
}

function pointDistance(point1, point2) {
	return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
}

function magResponse_polezero2(angle, poles, zeros) {
	var x = Math.cos(angle);
	var y = Math.sin(angle);

	var idx;
	var pProduct = 1;
	for (idx = 0; idx < poles.length; idx++) {
		pProduct *= pointDistance([x, y], poles[idx]);
	}
	var zProduct = 1;
	for (idx = 0; idx < zeros.length; idx++) {
		zProduct *= pointDistance([x, y], zeros[idx]);
	}
	if (zProduct == 0) zProduct = 0.00000000001;
	if (pProduct == 0) pProduct = 0.00000000001;
	return 20 * Math.log(zProduct / pProduct) / Math.LN10;
}
var startX;
var startY;

var zeros = new Array;
var poles = new Array;
var allPass = new Array;
var zerosNum = 0;
var polesNum = 0;
var allPassNum = 0;

function addNewPole() {
	console.log("I'm here!");
	
	poles.push([0, 0]);
	polesNum = polesNum + 1;
	setZplane(poles, zeros);
}

function addNewZero() {
	
	zeros.push([0, 0]);
	zerosNum = zerosNum + 1;
	setZplane(poles, zeros);
}

// // Get the input field
// var allPassValue = document.getElementById("");


function removeAllPassFilter(a) {
	allPass = allPass.filter(function (value, index, arr) {
		return !math.equal(value, math.complex(a));
	});
	allPassNum = allPassNum - 1;
	setZplane(poles, zeros);
}


function clearAllPoints() {
	poles = [];
	zeros = [];
	polesNum = 0;
	zerosNum = 0;
	setZplane(poles, zeros);
}
function clearZeros() {
	zeros = [];
	zerosNum = 0;
	setZplane(poles, zeros);
}
function clearPoles() {
	poles = [];
	polesNum = 0;
	setZplane(poles, zeros);
}

 