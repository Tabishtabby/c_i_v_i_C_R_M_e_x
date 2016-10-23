(function(angular, $, _) {

  // crm-ui-datepicker has a bug
  // after clearing the input screen the variable in ng-model doesn't change and still stores the previous value
  // To over come this bug check the input values
  // if return is 0 or 4, its safe to continue
  function checkDatePicker() {
    var bad = 0;
    $("#customDateRange :input").each(function() {
      
      var element = $(this);
      if ($.trim(this.value) == "") bad++;
    });
    return bad;
  }

  angular.module('currentmembersearch').factory('SearchOnCurrentMember', function(crmApi){
    return{

      getCurrentMembers : function(fromDate, toDate) {
        return crmApi('membership_status', 'getsingle', {sequential: true, name: 'Current'}).then(function(responseOne){
          
          if((typeof fromDate === 'undefined' && typeof fromDate === 'undefined') || checkDatePicker() == 4){
            var request = {sequential: true, status_id: responseOne.id};
          }

          if(typeof fromDate !== 'undefined' && typeof fromDate !== 'undefined' && checkDatePicker() == 0){
            var range   = [fromDate, toDate];
            var request = {sequential: true, status_id: responseOne.id, start_date : {'BETWEEN': range} };
          }

          return crmApi('membership', 'get', request)
          .then(function(responseTwo){

            if(responseTwo.count == 0) return 0;
            
            var people          = responseTwo.values;
            var listOfIds       = [];
            var currentMembers  = [];
            for (var i = 0; i < people.length; i++) {
              listOfIds.push(people[i].contact_id);
              currentMembers[people[i].contact_id] = people[i];
            }
            return crmApi('Contact', 'get', {sequential: true, id :{IN : listOfIds}, return : ['display_name', 'id']}).then(function(responseThree){
              var memberDetails   = responseThree.values;

              for (var i = 0; i < memberDetails.length; i++) {
                if(memberDetails[i].id == currentMembers[memberDetails[i].id].contact_id) {
                  memberDetails[i].membership = currentMembers[memberDetails[i].id]
                }
              }

              return memberDetails;
            })
          })
        });
      }
    }
    
  });
  angular.module('currentmembersearch').config(function($routeProvider) {
      $routeProvider.when('/currentMembership', {
        controller: 'CurrentMembershipController',
        templateUrl: '~/currentmembersearch/CurrentMembershipController.html',
        resolve:{
          getCurrentMembersDefault : function(SearchOnCurrentMember){
            return SearchOnCurrentMember.getCurrentMembers();  
          }
          
        }
      });
    }
  );

  
  
  angular.module('currentmembersearch').controller('CurrentMembershipController', function($scope, crmApi, crmStatus, crmUiHelp, SearchOnCurrentMember, getCurrentMembersDefault, crmUiAlert) {
    // The ts() and hs() functions help load strings for this module.
    var ts = $scope.ts = CRM.ts('currentmembersearch');
    var hs = $scope.hs = crmUiHelp({file: 'CRM/currentmembersearch/CurrentMembershipController'}); // See: templates/CRM/currentmembersearch/CurrentMembershipController.hlp

    $scope.currentMembers = getCurrentMembersDefault;
    
    $scope.search = function(fromDate = null, toDate = null) {
      
      // If checkDatePicker() = 4 flush old fromDate and toDate
      if(checkDatePicker() == 4){
        fromDate = null;
        toDate = null;
      }

      if(checkDatePicker() >= 1 && checkDatePicker() <= 3)
          crmUiAlert({text: "Sorry!! Please enter both 'From Date' and 'To Date' to get accurate results", title: 'Missing date', type: 'error'});

      if(checkDatePicker() == 0 || checkDatePicker() == 4){
        if (fromDate > toDate) {
          crmUiAlert({text: "Sorry!! 'To Date' should be greater than 'From Date'", title: 'Incorrect date format', type: 'error'});
        }

        if (fromDate < toDate || (fromDate == null && toDate == null)) {
          SearchOnCurrentMember.getCurrentMembers(fromDate, toDate).then(function(currentMembers){
            $scope.currentMembers = currentMembers;
          });  
        }
      }
      

    }

  });
})(angular, CRM.$, CRM._);
