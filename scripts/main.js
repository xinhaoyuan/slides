require(["jquery-ui"], function () {
    var config;
    var slides;
    var slideFrame;
    var slidesContainer;
    var slideWidth;
    var slideHeight;
    var slideMargin;
    var slideArrange;
    var currentIndex;
    var currentStep;
    var slideSteps = [];
    var archors = {};
    var slaveMode = false;
    var controlPair = null;
    var animatedDefault;
    var animated;
    var autoScale = undefined;

    function preprocessSlide(index, slide) {
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

    function preprocessSlideAnchorJump(index, slide) {
	    slide.find('a[href^="#"]').on('click', function (e) {
	        e.preventDefault();
            if (slaveMode) return false;
            
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

    function activateController() {
        $('.secret')
            .removeClass('secret')
            .addClass('secret-controller');
        $('body').addClass('controller');
        $('#open-presenter').removeClass('show');

        animated = animatedDefault = false;        
        autoScale = undefined;
        resizeEvent();
    }

    function deactivateController() {
        $('.secret-controller')
            .removeClass('.secret-controller')
            .addClass('.secret');
        $('body').removeClass('controller');

        setConfig();
        resizeEvent();
    }

    function setConfig() {
        config = $('#slides');
        if (!(slidesArrange = config.attr('arrange')))
            slideArrange = 'horizontal';
        if (config.attr('title')) 
            document.title = config.attr('title');
        if (!(animated = config.attr('animated'))) 
            animated = true;
        animatedDefault = animated;
        if (config.attr('autoScale'))
            autoScale = parseFloat(config.attr('autoScale'));
    }

    function preprocess() {

        setConfig();
        slides = $('.slide');

        if (slidesArrange == 'horizontal')
            slideMargin = parseInt(slides.css('margin-right'));
        else
            slideMargin = parseInt(slides.css('margin-bottom'));

        slides.each(function (index, slide) {
            slide = $(slide);
            slide.wrapInner('<div class="slide-inner"></div>');
            preprocessSlide(index, slide);
        });

        slides.each(function (index, slide) {
            preprocessSlideAnchorJump(index, $(slide));
        });

        resizeEvent();
        animated = false;
        hashUpdate();

        // turn on the slides
        $("body").removeClass('no-slides');
    }

    function cleanup() {
        config = undefined;
        slides = undefined;

        $('body').addClass('no-slides');
        $('#slides-container').empty();
        updateStatus();
    }

    function resizeEvent() {
        // console.log('window resize to ' + 
        //             $(window).width() + ' ' + $(window).height());
        // keep the slide to the center of the screen
        if (autoScale) {
            var scaleX = $(window).width() / slideWidth;
            var scaleY = $(window).height() / slideHeight;
            var scale = scaleX < scaleY ? scaleX : scaleY;
            slideFrame.css('transform', 'scale(' + (scale * autoScale) + ')');
        } else slideFrame.css('transform', '');
        slideFrame.css('left', ($('#screen').width() - slideWidth) / 2);
        slideFrame.css('top', ($('#screen').height() - slideHeight) / 2);
    }

    function switchClass(ele, before, after, animated) {
        if (animated) {
            ele.stop(true, true).switchClass(before, after);
        } else {
            ele.stop(true, true)
                .removeClass(before)
                .addClass(after);
        }
    }

    function jump(index, step) {
        if (index != currentIndex) {
            jumpPage(index, animated);
            jumpStep(step, false);
        } else {
            jumpStep(step, false);
        }
    }

    function jumpPage(index, animated) {
        var prop;
        var offset;

        if (slidesArrange == 'horizontal') {
            prop = { 'left' : -index * (slideWidth + slideMargin) };
        } else {
            prop = { 'top' : -index * (slideHeight + slideMargin) };
        }
         
        if (animated)
            slidesContainer.stop(true, true).animate(prop);
        else slidesContainer.stop(true, true).css(prop);
        currentIndex = index;
    }

    function jumpStep(step, animated) {
        // console.log('jump to ' + step);
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
            jumpPage(currentIndex - 1, animated);
            jumpStep(slideSteps[currentIndex].length, false);
        }
    }

    function nextPage() {
        if (currentIndex + 1< slides.size()) {
            jumpPage(currentIndex + 1, animated);
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
                switchClass(v.element, v.element.data('currentClass'), v.after, animated) 
                v.element.data('currentClass', v.after);
            });
            ++ currentStep;
            updateStatus();
        } else if (currentIndex + 1 < slides.size()) { 
            nextPage();
        }
    }

    function updateStatus() {
        if (slides) {
            text = '<span class="status-index">' + (currentIndex + 1) + '</span>';
            $('#status-bar').html(text);
            hash = '#' + currentIndex + ',' + currentStep;
            if (window.location.hash != hash)
                window.location.replace(hash);
            animated = animatedDefault;
        } else {
            $('#status-bar').empty();
        }
    }

    function uiPrev() {
        prevStep();
        if (controlPair) 
            controlPair.postMessage({ command : 'prev' }, '*');
    }

    function uiNext() {
        nextStep();
        if (controlPair) 
            controlPair.postMessage({ command : 'next' }, '*');
    }

    function processKeydown(e) {
        if (!slides) return true;

        var key = e.which;
        // console.log(key);

        if(key == 8 || key == 37 || key == 38) {
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
            // bs, left and up
            e.preventDefault();
            if (slaveMode) return false;
            uiPrev();
            return false;
        } else if (key == 32 || key == 39 || key == 40) {
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
            // space, right and down
            e.preventDefault();
            if (slaveMode) return false;
            uiNext();
            return false;
        } else if (key == 79) {
            // o
            var option;
            if (e.shiftKey) 
                options = '';
            else options = 'status=no,location=no,menubar=no,toolbar=no';
            if (slaveMode) return false;
            if (!controlPair) {
                w = window.open(window.location, '', options);
                if (!w) {
                    $('#open-presenter')
                        .addClass('show')
                        .html('<a href="' + window.location +
                              '" target="_blank">Presenting Screen</a>');
                }
                return false;
            }           
        }
        return true;
    }

    function hashUpdate (e) {
        if (!slides) return;
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
        updateStatus();
    }

    function processMessage(e) {
        e = e.originalEvent;
        if (!controlPair)
            controlPair = e.source;
        else if (controlPair !== e.source) return;
        
        // console.log('message: ' + e.data);
        data = e.data;
        if (data.command == 'next') {
            nextStep();
        } else if (data.command == 'prev') {
            prevStep();
        } else if (data.command == 'jump') {
            jump(data.index, data.step);
        } else if (data.command == 'childReady') {
            activateController();
            $(controlPair).bind('beforeunload', function(e) {
                console.log('connection pair closed');
                controlPair = null;
                deactivateController();
            });
            controlPair.postMessage({ command : 'parentReady' }, '*');
        } else if (data.command == 'parentReady') {
            slaveMode = true;
            $(controlPair).bind('beforeunload', function(e) {
                window.close();
            });
        }
    }

    function init() {
        slideFrame = $('#slide-frame');
        slidesContainer = $('#slides-container');

        var dummySlide = $('<div style="visibility: hidden;" class="slide"></div>')
            .appendTo($('body'));
        slideWidth  = dummySlide.width();
        slideHeight = dummySlide.height();
        dummySlide.remove();

        slideFrame.css('width', slideWidth);
        slideFrame.css('height', slideHeight);

        $(window).resize(resizeEvent);
        $(document).keydown(processKeydown);
        $(window).bind('hashchange', hashUpdate);
        $(window).on('message', processMessage);

        if (window.opener) {
            window.opener.postMessage({ command : 'childReady' }, '*');
        }
    }

    function noop(e) { 
        e.stopPropagation();
        e.preventDefault();
    }

    function loadContent(content) {
        $('#slides-container').html(content);
        window.location.replace('#');
        preprocess();
    }

    $(window).ready(function () {
        init();
        $('#slides-container').load('slides.html #slides', function (response, status, xhr) {
            if (status == 'success') {
                preprocess();
            } else {
                $('#slides-container').load('defaults/slides.sample.html #slides', preprocess);
            }
        });
    });

});
