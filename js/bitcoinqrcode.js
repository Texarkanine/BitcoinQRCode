$(function () {
    let app;

    const CURRENCY = {
        Bitcoin: {
            name: "Bitcoin",
            prefix: "bitcoin",
            units: ["BTC", "mBTC", "µBTC", "Satoshi"],
            overlays: [
                'pixel.png',
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

    function doesSolemnlySwearIsValidBTCAddress() {
        return $('#is_actually_address').is(':checked');
    }

    let App = function () {
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

        //delay the update in order to prevent too many updates for mobile users
        $('#address, #size, #amount, #label, #msg, #is_amount, #is_label, #is_msg, #is_actually_address')
            .on('change keyup input', function (event) {
                if (self.timer) {
                    clearTimeout(self.timer);
                }

                self.timer = setTimeout(self.update, 200);
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
    };

    App.prototype.update = function () {
        let self = app;

        let address = $('#address').val();
        let is_actually_address = $('#is_actually_address').is(':checked');

        let size = Math.max(64, Math.min(600, parseInt($('#size').val())));

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
            || ( is_actually_address !== self.is_actually_address )
            || ( size && size !== self.size )
            || ( amount && amount !== self.amount )
            || ( label && label !== self.label )
            || ( msg && msg !== self.msg )
            || ( is_amount !== self.is_amount )
            || ( is_label !== self.is_label )
            || ( is_msg !== self.is_msg )
        ) {
            
            const warningBox = $('#address_warning');
            if( ! isProbablyValidBTCAddress(address) ) {
                if( warningBox.is(':hidden')  ) {
                    $('#address_warning').show();
                }
            } else {
                $('#is_actually_address').prop('checked', false);
                $('#address_warning').hide();
            }

            self.is_actually_address = is_actually_address;
            
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
        if( isProbablyValidBTCAddress(this.address) || doesSolemnlySwearIsValidBTCAddress() ) {
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
                image.src = 'img/' + overlay;

                $(image).on('load', function () {
                    let wrap = $('<div>');

                    context.drawImage(image, offset, offset, size, size);

                    $(canvas)
                        .appendTo(wrap)
                        .show();

                    wrap.appendTo('#qrcodes');
                });
            }());
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
