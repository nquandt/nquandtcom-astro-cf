// Utility to check if user prefers reduced motion settings
export const isMotionOkay = () => {
    try {
        var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        var prefersReduced = mq ? mq.matches : false;
        return !prefersReduced;
    } catch (e) {
        console.error('isMotionOkay error', e);        
    }

    return false;
};