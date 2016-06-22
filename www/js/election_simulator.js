var ElectionSimulator = function(rslt_container, tab_container, ctrl_container, adjustments, ctrl_enabled, data) {
    var _self = this;

    _self.rslt_container = rslt_container;
    _self.tab_container = tab_container;
    _self.ctrl_container = ctrl_container;
    _self.adjustments = adjustments;
    _self.ctrl_enabled = ctrl_enabled;
    _self.tossUpStates = _.pluck(data, 'state');

    _self.calculateOutcome = function(adjustments) {
        var processedData = [];
        _.each(baseData.data, function(row) {
            var processedRow = {};
            var projectedGOPVotes = 0;
            var projectedDemVotes = 0;
            var adjustedGOPVotes = 0;
            var adjustedDemVotes = 0;
            var adjustedOtherVotes = 0;

            _.each(row.demographics, function(demographic) {
                var adjustment = adjustments.adjustments[demographic.demographic];

                var adjustedDemPct = demographic.d_pct - adjustment.pct;
                adjustedDemPct = (adjustedDemPct < 0) ? 0 : adjustedDemPct;
                adjustedDemPct = (adjustedDemPct > 1) ? 1 : adjustedDemPct;

                var adjustedGOPPct = demographic.r_pct + adjustment.pct;
                adjustedGOPPct = (adjustedGOPPct < 0) ? 0 : adjustedGOPPct;
                adjustedGOPPct = (adjustedGOPPct > 1) ? 1 : adjustedGOPPct;

                var adjustedTurnout = demographic.turnout + adjustment.turnout;
                adjustedTurnout = (adjustedTurnout < 0) ? 0 : adjustedTurnout;
                adjustedTurnout = (adjustedTurnout > 1) ? 1 : adjustedTurnout;

                var adjustedVotes = demographic.eligible_voters * adjustedTurnout;

                adjustedOtherVotes = Math.abs(demographic.r_pct - demographic.d_pct) * demographic.eligible_voters * demographic.turnout;
                adjustedGOPVotes += adjustedVotes * adjustedGOPPct;
                adjustedDemVotes += adjustedVotes * adjustedDemPct;
            });

            var adjustedTotalVotes = adjustedGOPVotes + adjustedDemVotes + adjustedOtherVotes;
            processedRow.demPct = adjustedDemVotes / adjustedTotalVotes;
            processedRow.gopPct = adjustedGOPVotes / adjustedTotalVotes;
            processedRow.margin = processedRow.gopPct - processedRow.demPct;

            processedRow.state = row.state;
            processedRow.electoralVotes = row.electoral_votes;

            processedData.push(processedRow);
        });
        return processedData;
    }
}

ElectionSimulator.prototype.getDetails = function(outcome) {
    var _self = this;
    var outcomes = {}

    for(var i = 0; i < _self.tossUpStates.length; ++i) {
        var state = _self.tossUpStates[i];
        outcomes[state] = [];
    }

    _.each(outcome, function(row) {
        var marginPct = Math.abs(row.margin) * 100;
        var winnerClass = (row.margin > 0) ? 'gop' : 'dem';
        var marginClass = 'margin-' + marginPct.toFixed(0);
        outcomes[row.state].push({
            winnerClass: winnerClass,
            marginClass: marginClass,
            margin: marginPct.toFixed(1),
            electoralVotes: row.electoralVotes
        });
    });

    return {
        rows: outcomes
    }
}

ElectionSimulator.prototype.getTotals = function(outcome) {
    var _self = this;

    var electoralVotes = {gop: 155, dem: 124};
    _.each(outcome, function(row) {
        var winnerClass = (row.margin > 0) ? 'gop' : 'dem';
        electoralVotes[winnerClass] += row.electoralVotes;
    });

    return {
        electoralVotes: electoralVotes
    }
}

ElectionSimulator.prototype.watchControl = function(e) {
    var _self=this;
    var outcome = _self.calculateOutcome(_self.adjustments);
    var totals = _self.getTotals(outcome)
    _self.resultsRactive.set('electoralVotes', totals.electoralVotes);
    var details = _self.getDetails(outcome)
    _self.tableReactive.set('rows', details.rows);

}

ElectionSimulator.prototype.render = function() {
        var _self = this;

        // Lauch initial calculations
        var outcome = _self.calculateOutcome(_self.adjustments);

        _self.tableReactive = new Ractive({
            el: _self.tab_container,
            template: '#margin-table-template',
            data: _self.getDetails(outcome)
        });

        _self.controlsRactive = new Ractive({
            el: _self.ctrl_container,
            template: '#controls-template',
            data: _self.adjustments
        });

        _self.resultsRactive = new Ractive({
            el: _self.rslt_container,
            template: '#results-template',
            data: _self.getTotals(outcome)
        });

        //Bind watchControl to the ElectionSimulator instance object
        if (_self.ctrl_enabled) {
            _self.controlsRactive.observe('*', _self.watchControl.bind(_self));
        }
}