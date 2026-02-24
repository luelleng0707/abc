// from: https://dev.to/li/how-to-requestpermission-for-devicemotion-and-deviceorientation-events-in-ios-13-46g2
function requestOrientation() {
    function enableListeners() {
        window.addEventListener('deviceorientation', handleOrientation, true);
        if (typeof handleMotion === 'function') {
            window.addEventListener('devicemotion', handleMotion, true);
        }
        const btn = document.querySelector('#requestOrientationButton');
        if (btn) { btn.innerText = 'Motion enabled'; btn.disabled = true; }
    }

    // iOS 13+: must request permission from user gesture
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const promises = [DeviceOrientationEvent.requestPermission()];
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            promises.push(DeviceMotionEvent.requestPermission());
        }
        Promise.all(promises).then((results) => {
            if (results[0] === 'granted') {
                enableListeners();
            } else {
                const btn = document.querySelector('#requestOrientationButton');
                if (btn) btn.innerText = 'Permission denied';
                alert('Motion permission denied');
            }
        }).catch(err => {
            console.error(err);
            const btn = document.querySelector('#requestOrientationButton');
            if (btn) btn.innerText = 'Permission denied';
            alert('Permission failed: ' + (err && err.message ? err.message : err));
        });
    } else {
        try {
            enableListeners();
        } catch (e) {
            console.error(e);
        }
    }
}

// attach click handler after DOM is ready (avoids inline onclick parsing issues)
document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('requestOrientationButton');
    if (btn) btn.addEventListener('click', requestOrientation);
});

// If Eruda (mobile devtools) is injected and not initialized, initialize it to avoid repeated messages
try {
    if (window.eruda && typeof window.eruda.init === 'function') {
        window.eruda.init();
        console.log('eruda initialized by page');
    }
} catch (e) {
    console.error('eruda init failed', e);
}
