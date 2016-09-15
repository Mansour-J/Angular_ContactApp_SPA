var app = angular.module('MUJ', [
    'ngResource',
    'infinite-scroll',
    'angularSpinner',
    'jcs-autoValidate',
    'angular-ladda',
    'mgcrea.ngStrap',
    'toaster',
    'ngAnimate',
    'ui.router'
]);


app.config(function ($stateProvider, $urlRouterProvider) {


    $stateProvider
        .state('list', {
            url: "/",
            templateUrl: 'templa'
        });


});

/**
 * Application Configuration :
 * It called before http or application or controllers or services created
 * we use function inside of it to take best out if it.
 * for e.g: we can configure angular-ladda to always expand right
 */
app.config(function ($httpProvider, $resourceProvider, laddaProvider, $datepickerProvider) {
    //services can have providers, provider is a factory which create http service
    // when angular bootstraping itself we can change setting with providers, then it will
    // use our configuration or our setting for creating stuff.
    $httpProvider.defaults.headers.common['Authorization'] = 'Token 20002cd74d5ce124ae219e739e18956614aab490';
    $resourceProvider.defaults.stripTrailingSlashes = false;
    laddaProvider.setOption({
        style: 'expand-right'
    });
    angular.extend($datepickerProvider.defaults, {
        dateFormat: 'd/M/yyyy',
        autoclose: true
    });
});

/**
 * creating Resource,  we named it Contact and we injected the RESOURCE into factory
 *
 */
app.factory("Contact", function ($resource) {
    //first parameter is a MAP, second one is an update function
    // when we call update function on contact resourse use method PUT
    // also the first ID is find id, CREATE, EDIT, UPDATE, from RESOURCE
    return $resource("https://codecraftpro.com/api/samples/v1/contact/:id/", {id: '@id'}, {
        update: {
            method: 'PUT'
        }
    });
});

/**
 * Creating our frist FILTER
 */
app.filter('defaultImage', function () {

    return function (input, param) {
        // console.log(input);
        // console.log(param);
        if (!input) {
            return param;
        }
        return input;
    };

});


/**
 * PersonDetailController
 * for using the angular module, from within the controller
 * which is angularStrap provide we should inject it into our controller
 *   $ modal is provided for Modal creating process
 */
app.controller('PersonDetailController', function ($scope, ContactService) {

    //Fetching data between our SERVICE(Contact Service and PersonDetail Controller)
    $scope.contacts = ContactService;


    //saving and removing from our resources, which is
    $scope.save = function () {
        $scope.contacts.updateContact($scope.contacts.selectedPerson)
    };

    $scope.remove = function () {
        $scope.contacts.removeContact($scope.contacts.selectedPerson)
    }
});


/**
 * PersonList Controller
 */
app.controller('PersonListController', function ($scope, $modal, ContactService) {

    $scope.search = "";
    $scope.order = "email";
    //Fetching data between our SERVICE(Contact Service and PersonList Controller)
    $scope.contacts = ContactService;


    $scope.loadMore = function () {
        console.log("Load More!!!");
        $scope.contacts.loadMore();
    };

    $scope.showCreateModal = function () {
        //since we using the selected person we want an empty form so we make selected person
        // empty with re-defining it empty
        $scope.contacts.selectedPerson = {};
        $scope.createModal = $modal({
            scope: $scope,
            template: 'templates/modal.create.tpl.html',
            //showing immediately
            show: true
        })
    };

    $scope.createContact = function () {
        console.log("createContact");
        $scope.contacts.createContact($scope.contacts.selectedPerson)
            .then(function () {
                $scope.createModal.hide();
            })
    };


    /*
     FOR CLIENT SIDE SEARCHING --> refer to html for binding :)
     $scope.sensitiveSearch = function (person) {
     if ($scope.search) {
     return person.name.indexOf($scope.search) == 0 ||
     person.email.indexOf($scope.search) == 0;
     }
     return true;
     };*/

    //watches is a way to getting notify whenever a variable change on a scope
    // the parameter can be a string or function in this case SEARCH variable
    //for server-side searching we send a request again to api when variable changed
    $scope.$watch('search', function (newVal, oldVal) {
        if (angular.isDefined(newVal)) {
            $scope.contacts.doSearch(newVal);
        }
    })

    $scope.$watch('order', function (newVal, oldVal) {
        if (angular.isDefined(newVal)) {
            $scope.contacts.doOrder(newVal);
        }
    })

});


/**
 * ContactService Service
 * Service is something that we can inject into a function parameter of
 * a controller list or other services
 *
 * e.g we used $http ino our controller which is a service
 *  all does that service does is returning an object.
 *  this service is named ContactService and has Contact as input
 *  for connection our service into our controller we should inject our service to
 *  controllers by adding the name of service as a parameter
 */
app.service('ContactService', function (Contact, $q, toaster) {


    var self = {
        'addPerson': function (person) {
            this.persons.push(person);
        },
        'page': 1,
        'hasMore': true,
        'isLoading': false,
        'isSaving': false,
        'selectedPerson': null,
        'persons': [],
        'search': null,
        'doSearch': function (search) {
            self.hasMore = true;
            self.page = 1;
            self.persons = [];
            self.search = search;
            self.loadContacts();
        },
        'doOrder': function (order) {
            self.hasMore = true;
            self.page = 1;
            self.persons = [];
            self.ordering = order;
            self.loadContacts();
        },
        'loadContacts': function () {
            if (self.hasMore && !self.isLoading) {
                self.isLoading = true;

                var params = {
                    'page': self.page,
                    'search': self.search,
                    'ordering': self.ordering
                };

                //whatever we send as first parameter is going to be
                //query to the restAPI
                Contact.get(params, function (data) {
                    console.log(data);
                    angular.forEach(data.results, function (person) {
                        // why not only add person?? we are storing a new resource instead of
                        // only an person object, and at top of the each person it add resource
                        // that we can use it like that update function that we added
                        self.persons.push(new Contact(person));
                    });

                    if (!data.next) {
                        self.hasMore = false;
                    }
                    self.isLoading = false;
                });
            }

        },
        'loadMore': function () {
            if (self.hasMore && !self.isLoading) {
                self.page += 1;
                self.loadContacts();
            }
        },
        'updateContact': function (person) {
            console.log("Service Called Update");
            self.isSaving = true;

            //when we finished updating we set it back to false;
            //using a dollar sign to insure that's a internal function
            //when we use an instance of a resource the promise return automaticly
            person.$update().then(function () {
                self.isSaving = false;
                toaster.pop('success', 'Updated ' + person.name);
            });
        },
        'removeContact': function (person) {
            self.isDeleting = true;
            person.$remove().then(function () {
                self.isDeleting = false;
                var index = self.persons.indexOf(person);
                self.persons.splice(index, 1);
                self.selectedPerson = null;
                toaster.pop('success', 'Deleted ' + person.name);
            });
        },
        'createContact': function (person) {
            var d = $q.defer();
            self.isSaving = true;
            //since we use main resource not an instance of it we should grab promise then use then
            Contact.save(person).$promise.then(function () {
                self.isSaving = false;
                self.selectedPerson = null;
                self.hasMore = true;
                self.page = 1;
                self.persons = [];
                self.loadContacts();
                toaster.pop('success', 'Created ' + person.name);
                d.resolve()
            });
            return d.promise;
        }


    };

    self.loadContacts();

    return self;

});