require(["jquery-ui"], function () {

    var slides;
    var slideFrame;
    var slidesContainer;
    var slidesOffsetContainer;
    var slideWidth;
    var slideHeight;
    var slideMargin;
    var currentIndex;
    var currentStep;
    var slideSteps = [];
    var archors = {};
    var controlPair = null;

    function preprocess(index, slide) {
        slideSteps[index] = [];
        var currentSteps = {}
        slide.find('[steps]').each(function (stepIndex, ele) {
            ele = $(ele);
            steps = ele.attr('steps').split(',');
            var i;
            for (i = 1; i + 1 < steps.length; i = i + 2) {
                var stepId = parseInt(steps[i])
                if (!(stepId in currentSteps)) currentSteps[stepId] = [];
                currentSteps[stepId].push(
                    { element: ele, before: steps[i - 1], after: steps[i + 1]});
            }
            ele.data('initialClass', steps[0]);
            ele.data('currentClass', steps[0]);
            ele.addClass(steps[0]);
        });
        var currentStepsSorted = [];
        for (var i in currentSteps)
            currentStepsSorted.push([parseInt(i), currentSteps[i]])
        currentStepsSorted.sort(function (a, b) { return a[0] - b[0]; });
        for (var i in currentStepsSorted) 
            slideSteps[index].push(currentStepsSorted[i][1]);
        slide.find('a[name]').each(function (i, e) {
            var ele = $(e);
            if (ele.attr('step')) {
                var s = 0;
                var step = parseInt(ele.attr('step'));
                while (s < currentStepsSorted.length && currentStepsSorted[s][0] < step) ++ s;
                archors[ele.attr('name')] = [ index, s ];
            } else {
                // page archor
                archors[ele.attr('name')] = index;
            }
        });
    }

    function preprocessAnchorJump(index, slide) {
	    slide.find('a[href^="#"]').on('click', function (e) {
	        e.preventDefault();
            if (window.opener) return false;
            
	        var target = this.hash.substring(1);
            if (target in archors) {
                archor = archors[target];
                if (archor instanceof Array) {
                    push(archor[0], archor[1]);
                } else {
                    push(archor, 0);
                }
                if (controlPair) 
                    controlPair.postMessage({ command : 'jump', index: currentIndex, step: currentStep }, '*');
            }

            return false;
	    });
    }

    function push(index, step) {
        window.location.hash = '#' + index + ',' + step;
    }

    function init() {
        
        slides = $('.slide');
        slideFrame = $('#slide-frame');
        slidesContainer = $('#slides');

        slideWidth  = slides.width();
        slideHeight = slides.height();
        slideMargin = parseInt(slides.css('margin-right'));

        slideFrame.css('width', slideWidth);
        slideFrame.css('height', slideHeight);

        slidesContainer.wrapInner('<div class="slides-offset"></div>');
        slidesOffsetContainer = slidesContainer.children();

        slides.each(function (index, slide) {
            slide = $(slide);
            slide.wrapInner('<div class="slide-inner"></div>');
            preprocess(index, slide);
        });

        slides.each(function (index, slide) {
            preprocessAnchorJump(index, $(slide));
        });

        resizeEvent();
        hashUpdate();

        // turn on the slides
        $("body").css('visibility', 'visible');

        if (window.opener) {
            $(window.opener).bind('beforeunload', function(e) {
                window.close();
            });
            window.opener.postMessage({ command : 'childReady' }, '*');
        }
        
    }

    function resizeEvent() {
        // keep the slide to the center of the screen
        slidesContainer.css('left', ($(window).width() - slideWidth) / 2);
        slidesContainer.css('top', ($(window).height() - slideHeight) / 2);
        slideFrame.css('left', ($(window).width() - slideWidth) / 2);
        slideFrame.css('top', ($(window).height() - slideHeight) / 2);
    }

    function switchClass(ele, before, after, animated) {
        if (animated) {
            ele.switchClass(before, after);
        } else {
            ele.removeClass(before);
            ele.addClass(after);
        }
    }

    function jump(index, step) {
        if (index != currentIndex) {
            jumpPage(index, true);
            jumpStep(step, false);
        } else {
            jumpStep(step, false);
        }
    }

    function jumpPage(index, animated) {
        offset = index * (slideWidth + slideMargin);
        if (animated)
            slidesOffsetContainer.animate({ 'left' : -offset });
        else slidesOffsetContainer.css('left', -offset);
        currentIndex = index;
    }

    function jumpStep(step, animated) {
        // console.log("jump to " + step);
        $(slides.get(currentIndex)).find('[steps]').each(function (index, ele) {
            ele = $(ele);
            ele.data('targetClass', ele.data('initialClass'));
        });

        for (var i = 0; i < step && i < slideSteps[currentIndex].length; ++ i) {
            $(slideSteps[currentIndex][i]).each(function (i, v) {
                v.element.data('targetClass', v.after);
            });
        }

        $(slides.get(currentIndex)).find('[steps]').each(function (index, ele) {
            ele = $(ele);
            if (ele.data('targetClass') != ele.data('currentClass')) {
                switchClass(ele, ele.data('currentClass'), ele.data('targetClass'), animated);
                ele.data('currentClass', ele.data('targetClass'));

            }
        });

        currentStep = step;
        updateStatus();
    }

    function prevPage() {
        if (currentIndex - 1 >= 0) {
            jumpPage(currentIndex - 1, true);
            jumpStep(slideSteps[currentIndex].length, false);
        }
    }

    function nextPage() {
        if (currentIndex + 1< slides.size()) {
            jumpPage(currentIndex + 1, true);
            jumpStep(0, false);
        }
    }

    function prevStep() {
        if (currentStep - 1 >= 0) {
            -- currentStep;
            $.each(slideSteps[currentIndex][currentStep], function(index, v) {
                switchClass(v.element, v.element.data('currentClass'), v.before, false) 
                v.element.data('currentClass', v.before);
            });
            updateStatus();
        } else if (currentIndex - 1 >= 0) {
            prevPage();
        }
    }

    function nextStep() {
        if (currentStep < slideSteps[currentIndex].length) {
            $.each(slideSteps[currentIndex][currentStep], function(index, v) {
                switchClass(v.element, v.element.data('currentClass'), v.after, true) 
                v.element.data('currentClass', v.after);
            });
            ++ currentStep;
            updateStatus();
        } else if (currentIndex + 1 < slides.size()) { 
            nextPage();
        }
    }

    function updateStatus() {
        text = '<span class="status-index">' + (currentIndex + 1) + '</span>';
        $('#status-bar').html(text);
        hash = '#' + currentIndex + ',' + currentStep;
        console.log(hash);
        if (window.location.hash != hash)
            window.location.replace(hash);
    }

    $(document).ready(init);
    $(window).resize(resizeEvent);

    $(document).keydown(function (e) {
        var key = e.which;
        // console.log(key);

        if(key == 8 || key == 37 || key == 38) {
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
            // bs, left and up
            e.preventDefault();
            if (window.opener) return false;
            prevStep();
            if (controlPair) 
                controlPair.postMessage({ command : 'prev' }, '*');
            return false;
        } else if (key == 32 || key == 39 || key == 40) {
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
            // space, right and down
            e.preventDefault();
            if (window.opener) return false;
            nextStep();
            if (controlPair) 
                controlPair.postMessage({ command : 'next' }, '*');
            return false;
        } else if (key == 79) {
            // o
            var option;
            if (e.shiftKey) 
                option = '';
            else option = 'status=no,location=no,menubar=no,toolbar=no';
            if (window.opener) return false;
            if (!controlPair) {
                window.open(window.location, '', option);
            }
        }
        return true;
    });

    function hashUpdate (e) {
        var index, step;
        if (window.location.hash.length == 0) {
            index = 0;
            step = 0;
        } else {
            var m = window.location.hash.match(/^#([0-9]+),([0-9]+)$/);
            if (!m) return;
            index = parseInt(m[1]);
            step = parseInt(m[2]);
        }
        if (index != currentIndex || step != currentStep)
            jump(index, step);
    }

    $(window).bind('hashchange', hashUpdate);

    $(window).on('message', function(e) {
        e = e.originalEvent;
        console.log(e);

        if (!controlPair)
            controlPair = e.source;
        else if (controlPair !== e.source) return;
        
        console.log('message: ' + e.data);
        data = e.data;
        if (data.command == 'next') {
            nextStep();
        } else if (data.command == 'prev') {
            prevStep();
        } else if (data.command == 'jump') {
            jump(data.index, data.step);
        } else if (data.command == 'childReady') {
            $("body").addClass("controller");
            $(controlPair).bind('beforeunload', function(e) {
                console.log('connection pair closed');
                controlPair = null;
                $("body").removeClass("controller");
            });
        }
    });
});
