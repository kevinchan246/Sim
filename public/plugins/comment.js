$(function() {
    //get comment
    $("#commentBtn").on("click", () => {
        $.ajax({
            url: `/home/${blog.slug}/comment`,
            contentType: "application/json",
            success: (response) => {
                let commentElem = $("#showComments");

                response.comments.forEach(comment => {
                    commentElem.append('\
                        <h2>'+comment.id+'</h2>\
                        <h3>'+comment.content+'</h3>\
                    ');
                });
            }
        })
    })
})