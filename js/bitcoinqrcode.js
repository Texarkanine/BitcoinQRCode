$(function () {
    let app;

    const CURRENCY = {
        Bitcoin: {
            name: "Bitcoin",
            prefix: "bitcoin",
            units: ["BTC", "mBTC", "µBTC", "Satoshi"],
            overlays: embeddedImages ? Object.keys(embeddedImages) : [
                'bitcoin-pixel.png',
                'bitcoin-icon.png',
                'bitcoin-coin.png',
                'bitcoin-coin2.png',
                'bitcoin-coin3.png',
                'bitcoin-coin4.png',
                'bitcoin-logo.png',
                'bitcoin-8bit.png'
            ]
        }
    };

    function isProbablyValidBTCAddress(address) {
        if (address.startsWith('1') ) {
            const btcAddressRegex = /^1[a-zA-Z0-9]{25,33}$/;
            return btcAddressRegex.test(address);
        } else if (address.startsWith('1') || address.startsWith('3')) {
            const btcAddressRegex = /^3[a-zA-Z0-9]{33}$/;
            return btcAddressRegex.test(address);
        } else if (address.startsWith('bc1')) {
            const btcAddressRegex = /^bc1[a-zA-Z0-9]{39,59}$/;
            return btcAddressRegex.test(address);
        } else if (address.startsWith('PM8T')) {
            const btcAddressRegex = /^(PM8T)[a-zA-Z0-9]{112}$/;
            return btcAddressRegex.test(address);
        } else {
            return false;
        }
    }

    function shouldUseBitcoinPrefix() {
        return $('#use_bitcoin_prefix').is(':checked');
    }

    let App = function () {
        this.MAX_WIDTH = 1024;
        this.MIN_WIDTH = 64;
        
        let self = this;

        this.type = CURRENCY.Bitcoin;

        this.address = '';
        this.size = 0;

        this.is_amount = false;
        this.is_label = false;
        this.is_msg = false;
        this.amount = 0; //this is always in BTC
        this.amount_factor = $('#amount-factor').find('option:selected').val();
        this.label = '';
        this.msg = '';

        this.timer = 0;

        this.should_use_bitcoin_prefix = false;

        //delay the update in order to prevent too many updates for mobile users
        $('#address, #size, #amount, #label, #msg, #is_amount, #is_label, #is_msg, input[name="use_bitcoin_prefix"]')
            .change(function (event) {
                console.log("need to redraw in 200ms...");
                if (self.timer) {
                    clearTimeout(self.timer);
                }

                self.timer = setTimeout(self.update, 200, event);
            });
        
        $('#address, #size, #amount, #label, #msg')
            .on('keyup input', function (event) {
                console.log("need to redraw in 200ms...");
                if (self.timer) {
                    clearTimeout(self.timer);
                }

                self.timer = setTimeout(self.update, 200, event);
            }).trigger('change');

        //currency unit changed
        $('#amount-factor').change(function () {
            let old_type = self.amount_factor;
            let new_type = $('#amount-factor').find('option:selected').val();

            let old_coins = $('#amount').val();
            let coins = btcConvert(old_coins, old_type, new_type, 'Big');
            $('#amount').val(coins.toFixed(8));

            self.amount_factor = new_type;
        });

        // keep checkboxes in sync
        $('input[name="use_bitcoin_prefix"]').change(function (event) {
            console.log("Synching all prefix checkboxes to " + $(event.target).is(':checked'));
            $('input[name="use_bitcoin_prefix"]').not(event.target).prop('checked', $(event.target).is(':checked'));
        });
    };

    App.prototype.update = function (event) {
        let self = app;

        let address = $('#address').val();
        let should_use_bitcoin_prefix = shouldUseBitcoinPrefix();

        let size = Math.max(
            self.MIN_WIDTH,
            Math.min(
                self.MAX_WIDTH,
                parseInt($('#size').val())));

        let is_amount = $('#is_amount').is(':checked');
        let is_label = $('#is_label').is(':checked');
        let is_msg = $('#is_msg').is(':checked');

        let amount = 0;
        if (is_amount) {
            amount = parseFloat($('#amount').val());
        }

        let label = '';
        if (is_label) {
            label = $('#label').val();
        }

        let msg = '';
        if (is_msg) {
            msg = $('#msg').val();
        }

        if (!address) {
            address = $('#address').attr('placeholder');
        }

        if (!size) {
            size = parseInt($('#size').attr('placeholder'), 10);
        }

        if (( address !== self.address )
            || ( should_use_bitcoin_prefix !== self.should_use_bitcoin_prefix )
            || ( size && size !== self.size )
            || ( amount && amount !== self.amount )
            || ( label && label !== self.label )
            || ( msg && msg !== self.msg )
            || ( is_amount !== self.is_amount )
            || ( is_label !== self.is_label )
            || ( is_msg !== self.is_msg )
        ) {

            if( address !== self.address) {
                // Warn if it's not a recognized as a valid BTC address.
                const warningBox = $('#address_warning');
                const prefixCheckboxes = $('input[name="use_bitcoin_prefix"]');
                if( ! isProbablyValidBTCAddress(address) ) {
                    // not recognized as a Bitcoin address
                    if( warningBox.is(':hidden')  ) {
                        $('#address_warning').show();
                        $('input[name="use_bitcoin_prefix"]').prop('checked', false);
                    }
                } else {
                    // recognized as a Bitcoin address
                    $('#address_warning').hide();
                    $('input[name="use_bitcoin_prefix"]').prop('checked', true);
                }

                should_use_bitcoin_prefix = shouldUseBitcoinPrefix();
            }

            self.should_use_bitcoin_prefix = should_use_bitcoin_prefix;
            
            self.is_amount = is_amount;
            self.is_label = is_label;
            self.is_msg = is_msg;

            self.address = address;
            self.size = size;

            self.amount = btcConvert(amount, self.amount_factor, 'BTC', 'Big').toFixed(8);
            self.label = label;
            self.msg = msg;

            $('#qrcodes').empty();
            self.draw();
        }
    };

    App.prototype.draw = function () {
        let self = this;

        let text = this.address;
        if( shouldUseBitcoinPrefix() ) {
            text = this.type.prefix + ':' + this.address;
        }

        if (this.is_amount) {
            text += '?amount=' + this.amount;
        }

        if (this.is_label) {
            if (this.is_amount) {
                text += '&label=' + this.label;
            } else {
                text += '?label=' + this.label;
            }
        }

        if (this.is_msg) {
            if (this.is_amount || this.is_label) {
                text += '&message=' + this.msg;
            } else {
                text += '?message=' + this.msg;
            }
        }

        $('#camera').val(text);

        $('#qrcode').empty();
        $('#qrcode').qrcode({
            text: text,
            width: self.size,
            height: self.size
        });

        let qrcode = $('#qrcode').find('canvas').get(0);

        $(self.type.overlays).each(function (i, overlay) {
            let canvas = $('<canvas>').get(0);
            let context = canvas.getContext('2d');
            let size = Math.floor(self.size);
            let offset = Math.floor(( self.size - size ) / 2);

            canvas.width = self.size;
            canvas.height = self.size;

            context.imageSmoothingEnabled = false;
            context.mozImageSmoothingEnabled = false;
            context.webkitImageSmoothingEnabled = false;

            //draw the QR-Code
            context.drawImage(qrcode, offset, offset, size, size);

            //draw the overlays
            (function () {
                let image = new Image();
                if( embeddedImages ) {
                    image.src = embeddedImages[overlay];
                } else {
                    image.src = 'img/' + overlay;
                }
                $(image).on('load', function () {

                    context.drawImage(image, offset, offset, size, size);

                    let wrap = $('<div>');

                    $(canvas)
                        .appendTo(wrap)
                        .show();

                    wrap.appendTo('#qrcodes');
                });
            }());

            // download on click
            $(canvas).click(function () {
                var a = document.createElement('a');
                a.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                a.download = "bitcoin-qrcode.png";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
            
        });
    };

    //toggle (hide/show) optional list
    $(function () {
        $(".toggler").click(function (e) {
            e.preventDefault();

            $(this).find("span").toggle();
            $(".togglee").slideToggle();
        });

        app = new App();
    });
}());
